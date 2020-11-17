import React from "react";

import { Warning } from "@skbkontur/react-icons";

import texts from "./ExerciseOutput.texts";
import styles from "./ExerciseOutput.less";
import {
	AutomaticExerciseCheckingResult as CheckingResult,
	AutomaticExerciseCheckingProcessStatus as ProcessStatus,
	ExerciseAutomaticCheckingResponse,
	SolutionRunStatus
} from "src/models/exercise";

enum OutputType {
	CompilationError = "CompilationError",
	WrongAnswer = "WrongAnswer",
	ServerError = "ServerError",
	ServerMessage = "ServerMessage",
	Success = "Success"
}

const outputTypeToStyleAndHeader: EnumDictionary<OutputType, { style: string, header: string }> = {
	[OutputType.CompilationError]: { style: styles.compilationErrorOutput, header: texts.headers.compilationError },
	[OutputType.WrongAnswer]: { style: styles.wrongAnswerOutput, header: texts.headers.wrongAnswer },
	[OutputType.ServerError]: { style: styles.serverErrorOutput, header: texts.headers.serverError },
	[OutputType.ServerMessage]: { style: styles.serverErrorOutput, header: texts.headers.serverMessage },
	[OutputType.Success]: { style: styles.output, header: texts.headers.output },
}

type OutputTypeAndBody = { outputType: OutputType, body: string | null };

function HasOutput(message: string, automaticChecking: ExerciseAutomaticCheckingResponse,
	expectedOutput: string
): boolean {
	if(message) {
		return true;
	}
	if(!automaticChecking) {
		return false;
	}
	return !!automaticChecking.output
		|| (automaticChecking.result === CheckingResult.WrongAnswer && !!expectedOutput)
}

interface OutputTypeProps {
	solutionRunStatus: string, // Success, если не посылка прямо сейчас
	message: string | null,
	expectedOutput: string | null,
	automaticChecking: ExerciseAutomaticCheckingResponse | null
}

class ExerciseOutput extends React.Component<OutputTypeProps> {
	render(): React.ReactNode {
		const { expectedOutput } = this.props;
		const { outputType, body } = this.getOutputTypeAndBody();
		const { style, header } = outputTypeToStyleAndHeader[outputType];
		const showIcon = outputType !== OutputType.Success;
		const isWrongAnswer = outputType === OutputType.WrongAnswer
		const isSimpleTextOutput = expectedOutput === null || !isWrongAnswer;

		return (
			<div className={ style }>
				<span className={ styles.outputHeader }>
					{ <React.Fragment>{ showIcon
						? <Warning/>
						: null } { header }</React.Fragment>
					} 
				</span>
				{ isSimpleTextOutput
					? ExerciseOutput.renderSimpleTextOutput(body ?? "")
					: ExerciseOutput.renderOutputLines(body ?? "", expectedOutput ?? "")
				}
			</div>
		);
	}

	getOutputTypeAndBody(): OutputTypeAndBody {
		const { solutionRunStatus, message, automaticChecking } = this.props;
		switch (solutionRunStatus) {
			case SolutionRunStatus.CompilationError:
				return { outputType: OutputType.CompilationError, body: message };
			case SolutionRunStatus.SubmissionCheckingTimeout:
			case SolutionRunStatus.Ignored:
				return { outputType: OutputType.ServerMessage, body: message }
			case SolutionRunStatus.InternalServerError:
				return { outputType: OutputType.ServerError, body: message }
			case SolutionRunStatus.Success:
				if(automaticChecking) {
					return ExerciseOutput.getOutputTypeAndBodyFromAutomaticChecking(automaticChecking);
				} else {
					console.error(
						new Error(`automaticChecking is null when solutionRunStatuses is ${ solutionRunStatus }`));
					return { outputType: OutputType.Success, body: message }
				}
			default:
				console.error(new Error(`solutionRunStatus has unknown value ${ solutionRunStatus }`));
				return { outputType: OutputType.ServerMessage, body: message }
		}
	}

	static getOutputTypeAndBodyFromAutomaticChecking(automaticChecking: ExerciseAutomaticCheckingResponse): OutputTypeAndBody {
		let outputType: OutputType;
		const output = automaticChecking.output;
		switch (automaticChecking.processStatus) {
			case ProcessStatus.Done:
				outputType = ExerciseOutput.getOutputTypeByCheckingResults(automaticChecking);
				break;
			case ProcessStatus.ServerError:
				outputType = OutputType.ServerError;
				break;
			case ProcessStatus.Waiting:
				outputType = OutputType.ServerMessage;
				break;
			case ProcessStatus.Running:
				outputType = OutputType.ServerMessage;
				break;
			case ProcessStatus.WaitingTimeLimitExceeded:
				outputType = OutputType.ServerError;
				break;
			default:
				console.error(new Error(`processStatuses has unknown value ${ automaticChecking.processStatus }`));
				outputType = OutputType.ServerMessage
		}
		return { outputType: outputType, body: output }
	}

	static getOutputTypeByCheckingResults(automaticChecking: ExerciseAutomaticCheckingResponse): OutputType {
		switch (automaticChecking.result) {
			case CheckingResult.CompilationError:
				return OutputType.CompilationError;
			case CheckingResult.WrongAnswer:
				return OutputType.WrongAnswer;
			case CheckingResult.RightAnswer:
				return OutputType.Success;
			case CheckingResult.NotChecked:
				return OutputType.ServerMessage;
			default:
				console.error(new Error(`checkingResults has unknown value ${ automaticChecking.result }`));
				return OutputType.ServerMessage
		}
	}

	static renderSimpleTextOutput(output: string): React.ReactNode {
		const lines = output.split('\n');
		return <div className={ styles.outputTextWrapper }>
			{ lines.map((text, i) =>
				<span key={ i } className={ styles.outputParagraph }>
					{ text }
				</span>)
			}
		</div>
	}

	static renderOutputLines(output: string, expectedOutput: string): React.ReactNode {
		const actualOutputLines = output.match(/[^\r\n]+/g) ?? [];
		const expectedOutputLines = expectedOutput.match(/[^\r\n]+/g) ?? [];
		const length = Math.max(actualOutputLines.length, expectedOutputLines.length);
		const lines = [];
		for (let i = 0; i < length; i++) {
			const actual = i < actualOutputLines.length ? actualOutputLines[i] : null;
			const expected = i < expectedOutputLines.length ? expectedOutputLines[i] : null;
			lines.push({ actual, expected });
		}

		return (
			<table className={ styles.outputTable }>
				<thead>
				<tr>
					<th/>
					<th>{ texts.output.userOutput }</th>
					<th>{ texts.output.expectedOutput }</th>
				</tr>
				</thead>
				<tbody>
				{ lines.map(({ actual, expected }, i) =>
					<tr key={ i }
						className={ actual === expected ? styles.outputMatchColor : styles.outputNotMatchColor }>
						<td><span>{ i + 1 }</span></td>
						<td><span>{ actual }</span></td>
						<td><span>{ expected }</span></td>
					</tr>
				) }
				</tbody>
			</table>
		);
	}
}

export { ExerciseOutput, OutputTypeProps, HasOutput }
