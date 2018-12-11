﻿using System.Threading.Tasks;
using Database.Models;
using Database.Repos;
using Database.Repos.CourseRoles;
using Database.Repos.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Serilog;
using Ulearn.Common.Extensions;

namespace Ulearn.Web.Api.Authorization
{
	public class CourseAccessRequirement: IAuthorizationRequirement
	{
		public readonly CourseAccessType CourseAccessType;

		public CourseAccessRequirement(CourseAccessType courseAccessType)
		{
			CourseAccessType = courseAccessType;
		}
	}
	
	/* TODO (andgein): extract common logic to BaseCourseHandler */
	public class CourseAccessAuthorizationHandler : AuthorizationHandler<CourseAccessRequirement>
	{
		private readonly ILogger logger;
		private readonly ICoursesRepo coursesRepo;
		private readonly ICourseRolesRepo courseRolesRepo;
		private readonly IUsersRepo usersRepo;

		public CourseAccessAuthorizationHandler(ICoursesRepo coursesRepo, ICourseRolesRepo courseRolesRepo, IUsersRepo usersRepo, ILogger logger)
		{
			this.coursesRepo = coursesRepo;
			this.courseRolesRepo = courseRolesRepo;
			this.usersRepo = usersRepo;
			this.logger = logger;
		}

		protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, CourseAccessRequirement requirement)
		{
			/* Get MVC context. See https://docs.microsoft.com/en-US/aspnet/core/security/authorization/policies#accessing-mvc-request-context-in-handlers */
			if (!(context.Resource is AuthorizationFilterContext mvcContext))
			{
				logger.Error("Can't get MVC context in CourseRoleAuthenticationHandler");
				context.Fail();
				return;
			}
			
			var routeData = mvcContext.RouteData;
			if (!(routeData.Values["courseId"] is string courseId))
			{
				logger.Error("Can't find `courseId` parameter in route data for checking course access requirement.");
				context.Fail();
				return;
			}

			if (!context.User.Identity.IsAuthenticated)
			{
				context.Fail();
				return;
			}

			var userId = context.User.GetUserId();
			var user = await usersRepo.FindUserByIdAsync(userId).ConfigureAwait(false);
			if (user == null)
			{
				context.Fail();
				return;
			}
			
			if (usersRepo.IsSystemAdministrator(user))
			{
				context.Succeed(requirement);
				return;
			}

			var isCourseAdmin = await courseRolesRepo.HasUserAccessToCourseAsync(userId, courseId, CourseRoleType.CourseAdmin).ConfigureAwait(false);
			if (isCourseAdmin || await coursesRepo.HasCourseAccessAsync(userId, courseId, requirement.CourseAccessType).ConfigureAwait(false))
				context.Succeed(requirement);
			else
				context.Fail();
		}
	}

	public class CourseAccessAuthorizeAttribute : AuthorizeAttribute
	{
		public CourseAccessAuthorizeAttribute(CourseAccessType accessType)
			: base(accessType.GetAuthorizationPolicyName())
		{
		}
	}
}