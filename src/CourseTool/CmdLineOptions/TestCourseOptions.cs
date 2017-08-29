using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using CommandLine;
using RunCsJob;

namespace uLearn.CourseTool.CmdLineOptions
{
	[Verb("test", HelpText = "Run tests on course")]
	class TestCourseOptions : AbstractOptions
	{
		[Option('s', "slide", HelpText = "SlideId to test only one specific slide")]
		public string SlideId { get; set; }

		public override void DoExecute()
		{
			var ulearnDir = new DirectoryInfo($"{Dir}/{Config.ULearnCourseId}");
			Console.Write("Loading Ulearn course from {0} ... ", ulearnDir.Name);
			var sw = Stopwatch.StartNew();
			var course = new CourseLoader().LoadCourse(ulearnDir);
			Console.WriteLine(sw.ElapsedMilliseconds + " ms");
			var slides = course.Slides;
			if (SlideId != null)
			{
				slides = course.Slides.Where(s => s.Id == Guid.Parse(SlideId)).ToList();
				Console.WriteLine("Only slide " + SlideId);
			}

			var validator = new CourseValidator(slides, new SandboxRunnerSettings());
			validator.InfoMessage += m => Write(ConsoleColor.Gray, m);
			var errors = new List<string>();
			validator.Error += m =>
			{
				Write(ConsoleColor.Red, m);
				errors.Add(m);
			};
			validator.Warning += m => { Write(ConsoleColor.DarkYellow, m); };
			validator.ValidateExercises();
			validator.ValidateVideos();
			if (errors.Any())
			{
				Console.WriteLine("Done! There are errors:");
				foreach (var error in errors)
				{
					Write(ConsoleColor.Red, error, true);
				}
			}
			else
				Console.WriteLine("OK! No errors found");
			Console.WriteLine("Press any key...");
			Console.ReadLine();
		}

		private void Write(ConsoleColor color, string message, bool error = false)
		{
			var oldColor = Console.ForegroundColor;
			Console.ForegroundColor = color;
			try
			{
				if (error)
				{
					Console.Error.WriteLine(message);
					Environment.ExitCode = -1;
				}
				else
					Console.WriteLine(message);
			}
			finally
			{
				Console.ForegroundColor = oldColor;
			}
		}
	}
}