using System.Runtime.Serialization;
using JetBrains.Annotations;

namespace Ulearn.Web.Api.Models.Responses.Exercise
{
	public enum SolutionRunStatus
	{
		Success,
		InternalServerError, // Ошибка в проверяющей системе, подробности могут быть в Message. Если submission создан, он лежит в Submission, иначе null.
		Ignored, // Сервер отказался обрабатывать решение, причина написана в Message. Cлишком частые запросы на проверку или слишком длинный код.
		SubmissionCheckingTimeout, // Ждали, но не дожадлись проверки
		// В случае ошибки компиляции Submission создается не всегда. Не создается для C#-задач. Тогда текст ошибки компиляции кладется в Message.
		// Если Submission создался, то об ошибках компиляции пишется внутри Submission -> AutomaticChecking.
		CompilationError 
	}

	[DataContract]
	public class RunSolutionResponse
	{
		[DataMember]
		public SolutionRunStatus SolutionRunStatus;

		[CanBeNull]
		[DataMember]
		public string Message { get; set; } // Сообщение от проверяющей системы в случае ошибок на сервере и в случае некоторых ошибок компиляции.

		[CanBeNull]
		[DataMember]
		public SubmissionInfo Submission; // Если submission создан, он лежит в Submission, иначе null. Не создан в случае некоторых ошибок на сервере и иногда в случае ошибок компиляции.

		[DataMember]
		public int? Score { get; set; } // В случае rightAnswer не null. В остальных как попало; если null, то не изменился.

		[DataMember]
		public bool? WaitingForManualChecking { get; set; } // В случае rightAnswer не null. В остальных как попало; если null, то не изменился.

		public bool? ProhibitFurtherManualChecking { get; set; } // В случае rightAnswer не null.

		public RunSolutionResponse(SolutionRunStatus status)
		{
			SolutionRunStatus = status;
		}
	}
}