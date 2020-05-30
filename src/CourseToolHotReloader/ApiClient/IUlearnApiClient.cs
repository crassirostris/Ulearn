﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CourseToolHotReloader.DirectoryWorkers;
using CourseToolHotReloader.Dtos;
using CourseToolHotReloader.Log;

namespace CourseToolHotReloader.ApiClient
{
	public interface IUlearnApiClient
	{
		Task<bool> TrySendCourseUpdates(IList<ICourseUpdate> update, IList<ICourseUpdate> deletedFiles, string token, string courseId);
		Task SendFullCourse(string path, string token, string courseId);
	}

	internal class UlearnApiClient : IUlearnApiClient
	{
		public async Task<bool> TrySendCourseUpdates(IList<ICourseUpdate> updates, IList<ICourseUpdate> deletedFiles, string token, string courseId)
		{
			var ms = ZipUpdater.CreateZipByUpdates(updates, deletedFiles);

			var updateResponse = await HttpMethods.UploadCourse(ms, token, courseId);

			if (updateResponse.ErrorType == ErrorType.NoErrors)
				return true;
			
			ConsoleWorker.WriteError(updateResponse.Message);
			return false;

		}

		public async Task SendFullCourse(string path, string token, string courseId)
		{
			var ms = ZipUpdater.CreateZipByFolder(path);

			var updateResponse = await HttpMethods.UploadFullCourse(ms, token, courseId);

			if (updateResponse.ErrorType != ErrorType.NoErrors)
			{
				ConsoleWorker.WriteError(updateResponse.Message);
			}
		}
	}
}