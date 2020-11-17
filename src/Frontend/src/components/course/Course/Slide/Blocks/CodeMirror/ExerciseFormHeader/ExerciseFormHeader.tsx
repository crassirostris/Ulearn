import React from "react";

import texts from "./ExerciseFormHeader.texts";
import styles from "./ExerciseFormHeader.less";
import {
	AutomaticExerciseCheckingProcessStatus as ProcessStatus,
	AutomaticExerciseCheckingResult as CheckingResult,
	RunSolutionResponse,
	SolutionRunStatus,
	SubmissionInfo
} from "src/models/exercise";

interface ExerciseFormHeaderProps {
	checkingResponse: RunSolutionResponse | null, // Если результаты посылки, сделанной только что
	selectedSubmission: SubmissionInfo | null, // Если результаты выбранной посылки
	waitingForManualChecking: boolean, // True, если именно это решение ожидает ревью
	prohibitFurtherManualChecking: boolean, // True, если ревью по задаче включено, но запрещено для задачи этого студента преподавателем
	selectedSubmissionIsLast?: boolean,
}

type StyleAndText = { style: string, text: string } | null;

class ExerciseFormHeader extends React.Component<ExerciseFormHeaderProps> {
	render(): React.ReactNode {
		const styleAndText = this.getStyleAndText();
		if(!styleAndText) {
			return null;
		}
		const { style, text } = styleAndText;
		return (
			<div className={ style }>
				{ text }
			</div>
		);
	}

	getStyleAndText(): StyleAndText {
		const { checkingResponse, selectedSubmission } = this.props;
		if(checkingResponse) {
			return this.getStyleAndTextForCheckingResponse(checkingResponse);
		}
		if(selectedSubmission) {
			return this.getStyleAndTextForSelectedSubmission(selectedSubmission);
		}
		return null;
	}

	getStyleAndTextForSelectedSubmission(selectedSubmission: SubmissionInfo): StyleAndText {
		const { waitingForManualChecking, prohibitFurtherManualChecking, selectedSubmissionIsLast } = this.props;
		const { automaticChecking, manualCheckingPassed, } = selectedSubmission;
		if(automaticChecking) {
			if (automaticChecking.result === CheckingResult.RightAnswer) {
				return ExerciseFormHeader.getStyleAndTextAllTestPassed(waitingForManualChecking,
					prohibitFurtherManualChecking, manualCheckingPassed, !!selectedSubmissionIsLast);
			}
			switch (automaticChecking.processStatus) {
				case ProcessStatus.Running:
					return { style: styles.header, text: texts.running };
				case ProcessStatus.Waiting:
					return { style: styles.header, text: texts.running };
			}
		} else {
			return ExerciseFormHeader.getStyleAndTextNoTests(waitingForManualChecking,
				prohibitFurtherManualChecking, selectedSubmission.manualCheckingPassed);
		}
	}

	getStyleAndTextForCheckingResponse(checkingResponse: RunSolutionResponse): StyleAndText {
		const { waitingForManualChecking, prohibitFurtherManualChecking, } = this.props;
		const { solutionRunStatus, submission, } = checkingResponse;
		if(solutionRunStatus === SolutionRunStatus.Success && submission) {
			if(submission.automaticChecking) {
				if(submission.automaticChecking.result === CheckingResult.RightAnswer) {
					return ExerciseFormHeader.getStyleAndTextAllTestPassed(waitingForManualChecking,
						prohibitFurtherManualChecking, submission.manualCheckingPassed, true);
				}
			} else {
				return ExerciseFormHeader.getStyleAndTextNoTests(waitingForManualChecking,
					prohibitFurtherManualChecking, submission.manualCheckingPassed);
			}
		}
		return null;
	}

	static getStyleAndTextAllTestPassed(waitingForManualChecking: boolean, prohibitFurtherManualChecking: boolean,
		manualCheckingPassed: boolean, isLastSubmission: boolean
	): StyleAndText {
		if(manualCheckingPassed) {
			return { style: styles.successHeader, text: texts.allTestPassedWasReviewed };
		}
		if(waitingForManualChecking) {
			return { style: styles.header, text: texts.allTestPassedPendingReview };
		}
		if(prohibitFurtherManualChecking) {
			return { style: styles.header, text: texts.noTestsProhibitFurtherReview };
		}
		if(isLastSubmission) {
			return { style: styles.successHeader, text: texts.allTestPassedNoReview };
		}
		return { style: styles.successHeader, text: texts.allTestPassed };
	}

	static getStyleAndTextNoTests(waitingForManualChecking: boolean, prohibitFurtherManualChecking: boolean,
		manualCheckingPassed: boolean
	)
		: StyleAndText {
		if(manualCheckingPassed) {
			return { style: styles.successHeader, text: texts.noTestsWasReviewed };
		}
		if(waitingForManualChecking) {
			return { style: styles.header, text: texts.noTestsPendingReview };
		}
		if(prohibitFurtherManualChecking) {
			return { style: styles.header, text: texts.noTestsProhibitFurtherReview };
		}
		return null;
	}
}

export { ExerciseFormHeader, ExerciseFormHeaderProps }
