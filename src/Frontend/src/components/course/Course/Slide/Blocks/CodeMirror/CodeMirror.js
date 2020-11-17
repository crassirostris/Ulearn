import React from 'react';

import { Controlled, } from "react-codemirror2";
import { Button, Checkbox, FLAT_THEME, Modal, Select, Tooltip, } from "ui";
import Review from "./Review/Review";
import { darkTheme } from 'ui/internal/ThemePlayground/darkTheme';
import DownloadedHtmlContent from "src/components/common/DownloadedHtmlContent";
import { Lightbulb, Refresh, EyeOpened, DocumentLite, } from "icons";
import CongratsModal from "./CongratsModal/CongratsModal";
import { ExerciseOutput, HasOutput } from "./ExerciseOutput/ExerciseOutput.tsx";
import { ThemeContext } from "@skbkontur/react-ui/index";

import PropTypes from 'prop-types';
import classNames from 'classnames';
import { connect } from "react-redux";

import { sendCode, addReviewComment, } from "src/actions/course";

import { constructPathToAcceptedSolutions, } from "src/consts/routes";
import {
	AutomaticExerciseCheckingResult as CheckingResult,
	AutomaticExerciseCheckingProcessStatus as ProcessStatus,
	SolutionRunStatus } from "src/models/exercise.ts";
import { isMobile, isTablet, } from "src/utils/getDeviceType";
import { userType } from "src/components/comments/commonPropTypes";

import CodeMirrorBase from 'codemirror/lib/codemirror';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/show-hint.css';
import 'codemirror/addon/hint/javascript-hint';
import 'codemirror/addon/hint/anyword-hint';
import 'codemirror/theme/darcula.css';
import './CodeMirrorAutocompleteExtension';

import styles from './CodeMirror.less';

import texts from './CodeMirror.texts';

const isControlsTextSuits = () => !isMobile() && !isTablet();
const editThemeName = 'darcula';
const defaultThemeName = 'default';


class CodeMirror extends React.Component {
	constructor(props) {
		super(props);
		const { exerciseInitialCode, submissions, code, } = props;

		this.state = {
			value: exerciseInitialCode || code,
			valueChanged: false,

			isEditable: submissions.length === 0,

			showedHintsCount: 0,
			showAcceptedSolutions: false,
			showAcceptedSolutionsWarning: false,
			congratsModalData: null,

			resizeTimeout: null,
			showControlsText: isControlsTextSuits(),

			submissionLoading: false,
			visibleCheckingResponse: null,
			currentSubmission: null,
			currentReviews: [],
			selectedReviewId: -1,
			showOutput: false,

			editor: null,
			exerciseCodeDoc: null,

			newTry: CodeMirror.createEmptyNewTry(),

			selfChecks: texts.checkups.self.checks.map((ch, i) => ({
				text: ch,
				checked: false,
				onClick: () => this.onSelfCheckBoxClick(i)
			})),
		}
	}

	componentDidMount() {
		this.overrideCodeMirrorAutocomplete();

		this.loadSlideSubmission();

		window.addEventListener("beforeunload", this.saveCodeDraftToCache);
		window.addEventListener("resize", this.onWindowResize);
	}

	loadSlideSubmission = () => {
		const { slideId, submissions, } = this.props;

		if(submissions.length > 0) {
			this.loadSubmissionToState(submissions[0]);
		} else {
			this.refreshPreviousDraft(slideId);
		}
	}

	componentDidUpdate(prevProps, prevState, snapshot) {
		const { lastCheckingResponse, courseId, slideId, submissions, } = this.props;
		const { currentSubmission, submissionLoading, showOutput, } = this.state;

		if(courseId !== prevProps.courseId || slideId !== prevProps.slideId) {
			this.loadSlideSubmission();
			return;
		}

		const hasNewLastCheckingResponse = lastCheckingResponse
			&& lastCheckingResponse !== prevProps.lastCheckingResponse; // Сравнение по ссылкам
		if(hasNewLastCheckingResponse) {
			const { submission, solutionRunStatus, score, waitingForManualChecking, } = lastCheckingResponse;

			if(submission) {
				this.loadSubmissionToState(submissions.find(s => s.id === submission.id));
			} else {
				this.setState({
					visibleCheckingResponse: lastCheckingResponse,
				});
			}
			if(submissionLoading) {
				this.setState({
					submissionLoading: false,
				});
			}
			if(!showOutput) {
				this.setState({
					showOutput: true,
				});
			}

			if(solutionRunStatus === SolutionRunStatus.Success) {
				const { automaticChecking } = submission;

				if(automaticChecking) {
					if(automaticChecking.processStatus === ProcessStatus.Done) {
						if(automaticChecking.result === CheckingResult.RightAnswer) {
							this.openModal({ // TODO вроде не показываем модалку, если уже было решено ранее?
								score,
								waitingForManualChecking,
							});
						}
					}
				}
			}
		} else if(currentSubmission) {
			const submission = submissions.find(s => s.id === currentSubmission.id);

			if(currentSubmission !== submission) { // Сравнение по ссылке. Отличаться должны только в случае изменения комментериев
				this.setCurrentSubmission(submission);
			}
		}
	}

	onWindowResize = () => {
		const { resizeTimeout } = this.state;

		const throttleTimeout = 66;

		//resize event can be called rapidly, to prevent performance issue, we throttling event handler
		if(!resizeTimeout) {
			this.setState({
				resizeTimeout: setTimeout(() => {
					this.setState({
						resizeTimeout: null,
						showControlsText: isControlsTextSuits(),
					})
				}, throttleTimeout),
			});
		}
	}
	overrideCodeMirrorAutocomplete = () => {
		const { language, } = this.props;

		CodeMirrorBase.commands.autocomplete = function (cm) {
			const hint = CodeMirrorBase.hint[language.toLowerCase()];
			if(hint) {
				cm.showHint({ hint: hint });
			}
		};
	}

	saveCodeDraftToCache = () => {
		const { slideId, } = this.props;

		this.saveExerciseCodeDraft(slideId);
	}

	componentWillUnmount() {
		this.saveCodeDraftToCache();
		window.removeEventListener("beforeunload", this.saveCodeDraftToCache);
		window.removeEventListener("resize", this.onWindowResize);
	}

	render() {
		const { className, } = this.props;

		const opts = this.codeMirrorOptions;

		return (
			<div className={ classNames(styles.wrapper, className) }>
				{ this.renderControlledCodeMirror(opts) }
			</div>
		);
	}

	get codeMirrorOptions() {
		const { language, isAuthenticated, } = this.props;
		const { isEditable, } = this.state;

		return {
			mode: CodeMirror.loadLanguageStyles(language),
			lineNumbers: true,
			scrollbarStyle: 'null',
			lineWrapping: true,
			theme: isEditable ? editThemeName : defaultThemeName,
			readOnly: !isEditable || !isAuthenticated,
			matchBrackets: true,
			tabSize: 4,
			indentUnit: 4,
			indentWithTabs: true,
			extraKeys: {
				ctrlSpace: "autocomplete",
				".": function (cm) {
					setTimeout(function () {
						cm.execCommand("autocomplete");
					}, 100);
					cm.replaceSelection('.');
				}
			},
		};
	}

	renderControlledCodeMirror = (opts) => {
		const { expectedOutput, submissions, author, } = this.props;
		const {
			value, showedHintsCount, showAcceptedSolutions, currentSubmission,
			isEditable, exerciseCodeDoc, congratsModalData,
			currentReviews, showOutput, selectedReviewId, visibleCheckingResponse
		} = this.state;

		const isReview = !isEditable && currentReviews.length > 0;

		const wrapperClassName = classNames(
			styles.exercise,
			{ [styles.reviewWrapper]: isReview },
		);
		const editorClassName = classNames(
			styles.editor,
			{ [styles.editorWithoutBorder]: isEditable },
			{ [styles.editorInReview]: isReview },
		);
		const automaticChecking = currentSubmission?.automaticChecking ?? visibleCheckingResponse?.automaticChecking;

		return (
			<React.Fragment>
				{ submissions.length !== 0 && this.renderSubmissionsSelect() }
				{ /*!isEditable && currentSubmission && this.renderHeader() */}
				<div className={ wrapperClassName }>
					<Controlled
						onBeforeChange={ this.onBeforeChange }
						editorDidMount={ this.onEditorMount }
						onCursorActivity={ this.onCursorActivity }
						className={ editorClassName }
						options={ opts }
						value={ value }
					/>
					{ exerciseCodeDoc && isReview &&
					<Review
						userId={ author.id }
						addReviewComment={ this.addReviewComment }
						selectedReviewId={ selectedReviewId }
						onSelectComment={ this.selectComment }
						reviews={ currentReviews }
						getReviewAnchorTop={ this.getReviewAnchorTop }
					/>
					}
				</div>
				{ !isEditable && this.renderEditButton() }
				{/* TODO not included in current release !isEditable && currentSubmission && this.renderOverview(currentSubmission)*/ }
				{ this.renderControls() }
				{ showOutput && HasOutput(visibleCheckingResponse?.message, automaticChecking, expectedOutput) && // TODO показывать вывод в случае статуса процесса и эта последняя посылка
				<ExerciseOutput
					solutionRunStatus={ visibleCheckingResponse?.solutionRunStatus ?? SolutionRunStatus.Success }
					message={ visibleCheckingResponse?.message }
					expectedOutput={ expectedOutput }
					automaticChecking={ automaticChecking }
				/>
				}
				{ showedHintsCount > 0 && this.renderHints() }
				{ showAcceptedSolutions && this.renderAcceptedSolutions() }
				{ congratsModalData && this.renderCongratsModal(congratsModalData) }
			</React.Fragment>
		)
	}

	getReviewAnchorTop = (review) => {
		const { exerciseCodeDoc, } = this.state;

		return exerciseCodeDoc.cm.charCoords({
			line: review.startLine,
			ch: review.startPosition,
		}, 'local').top;
	}

	renderSubmissionsSelect = () => {
		const { currentSubmission, newTry } = this.state;
		const { submissions, } = this.props;

		const submissionsWithNewTry = [newTry, ...submissions,];
		const items = submissionsWithNewTry.map((submission) => ([submission.id, submission.caption]));

		return (
			<div className={ styles.submissionsDropdown }>
				<ThemeContext.Provider value={ FLAT_THEME }>
					<Select
						items={ items }
						value={ currentSubmission?.id || -1 }
						onValueChange={ (id) => this.loadSubmissionToState(submissionsWithNewTry.find(s => s.id === id)) }
					/>
				</ThemeContext.Provider>
			</div>
		);
	}

	loadSubmissionToState = (submission,) => {
		if(submission.id < 0) {
			this.loadNewTry();
			return;
		}
		this.saveCodeDraftToCache();
		this.clearAllTextMarkers();

		// Firstly we updating code in code mirror
		// when code is rendered we attaching reviewMarkers and loading reviews
		// after all is done we refreshing editor to refresh layout and sizes depends on reviews sizes
		this.setState({
				value: submission.code,
				isEditable: false,
				valueChanged: false,
				showOutput: false,
				visibleCheckingResponse: null,
			}, () =>
				this.setCurrentSubmission(submission)
		);
	}

	setCurrentSubmission = (submission) => {
		this.clearAllTextMarkers();
		this.setState({
			currentSubmission: submission,
			currentReviews: this.getReviewsWithTextMarkers(submission),
		}, () => this.state.editor.refresh())
	}

	openModal = (data) => {
		this.setState({
			congratsModalData: data,
		})
	}

	getReviewsWithTextMarkers = (submission) => {
		const reviews = this.getAllReviewsFromSubmission(submission);

		const reviewsWithTextMarkers = [];

		for (const review of reviews) {
			const { finishLine, finishPosition, startLine, startPosition } = review;
			const textMarker = this.highlightLine(finishLine, finishPosition, startLine, startPosition, styles.reviewCode);

			reviewsWithTextMarkers.push({
				marker: textMarker,
				...review
			});
		}

		return reviewsWithTextMarkers;
	}

	getAllReviewsFromSubmission = (submission) => {
		if(!submission) {
			return [];
		}

		const manual = submission.manualCheckingReviews || [];
		const auto = submission.automaticChecking && submission.automaticChecking.reviews ? submission.automaticChecking.reviews : [];
		return manual.concat(auto);
	}

	renderOverview = (submission) => {
		const { selfChecks } = this.state;
		const checkups = [
			{
				title: texts.checkups.self.title,
				content:
					<React.Fragment>
						<span className={ styles.overviewSelfCheckComment }>
							{ texts.checkups.self.text }
						</span>
						<ul className={ styles.overviewSelfCheckList }>
							{ this.renderSelfCheckBoxes(selfChecks) }
						</ul>
					</React.Fragment>
			},
		];

		if(submission.automaticChecking.reviews !== 0) {
			checkups.unshift(
				{
					title: texts.checkups.bot.title,
					content:
						<span className={ styles.overviewComment }>
						{ texts.checkups.bot.countBotComments(submission.automaticChecking.reviews) }
							<a onClick={ this.showFirstBotComment }>{ texts.showReview }</a>
					</span>
				});
		}

		if(submission.manualCheckingReviews.length !== 0) {
			const reviewsCount = submission.reviews.length;

			checkups.unshift({
				title: texts.checkups.teacher.title,
				content:
					<span className={ styles.overviewComment }>
						{ texts.checkups.teacher.countTeacherReviews(reviewsCount) }
						<a onClick={ this.showFirstComment }>{ texts.showReview }</a>
					</span>
			});
		}

		return (
			<ul className={ styles.overview }>
				{ checkups.map(({ title, content }) =>
					<li key={ title } className={ styles.overviewLine } title={ title }>
						<h3>{ title }</h3>
						{ content }
					</li>
				) }
			</ul>
		);
	}

	renderSelfCheckBoxes = (selfChecks) => {
		return (
			selfChecks.map(({ text, checked, onClick, }, i) =>
				<li key={ i }>
					<Checkbox checked={ checked } onClick={ onClick }/> <span
					className={ styles.selfCheckText }>{ text }</span>
				</li>
			)
		);
	}

	onSelfCheckBoxClick = (i) => {
		const { selfChecks } = this.state;
		const newSelfChecks = [...selfChecks];

		newSelfChecks[i].checked = !newSelfChecks[i].checked;

		this.setState({
			selfChecks: newSelfChecks,
		});
	}

	renderControls = () => {
		const { hints, hideSolutions, isSkipped, submissions, expectedOutput } = this.props;
		const { isEditable, currentSubmission, showedHintsCount, visibleCheckingResponse } = this.state;

		return (
			<div className={ styles.exerciseControlsContainer }>
				{ this.renderSubmitSolutionButton() }
				<ThemeContext.Provider value={ darkTheme }>
					{ hints.length > 0 && this.renderShowHintButton() }
					{ isEditable && this.renderResetButton() }
					{ !isEditable && currentSubmission && HasOutput(visibleCheckingResponse?.message, currentSubmission.automaticChecking, expectedOutput)
					&& this.renderShowOutputButton()
					}
					{ this.renderShowStatisticsHint() }
				</ThemeContext.Provider>
				{ !hideSolutions
				&& (hints.length === showedHintsCount || submissions.length > 0 || isSkipped)
				&& this.renderShowAcceptedSolutionsButton()
				}
			</div>
		)
	}

	renderSubmitSolutionButton = () => {
		const { valueChanged, submissionLoading, } = this.state;

		return (
			<span className={ styles.exerciseControls }>
				<Tooltip pos={ "bottom center" } trigger={ "hover&focus" }
						 render={ () => valueChanged ? null : <span>{ texts.controls.submitCode.hint }</span> }>
							<Button
								loading={ submissionLoading }
								use={ "primary" }
								disabled={ !valueChanged }
								onClick={ this.sendExercise }>
								{ texts.controls.submitCode.text }
							</Button>
				</Tooltip>
			</span>
		);
	}

	renderShowHintButton = () => {
		const { showedHintsCount, showControlsText, } = this.state;
		const { hints, } = this.props;
		const noHintsLeft = showedHintsCount === hints.length;
		const hintClassName = classNames(styles.exerciseControls, { [styles.noHintsLeft]: noHintsLeft });

		return (
			<span className={ hintClassName } onClick={ this.showHint }>
				<Tooltip pos={ "bottom center" } trigger={ "hover&focus" }
						 render={ () => noHintsLeft ? <span>{ texts.controls.hints.hint }</span> : null }>
					<span className={ styles.exerciseControlsIcon }>
						<Lightbulb/>
					</span>
					{ showControlsText && texts.controls.hints.text }
				</Tooltip>
			</span>
		);
	}

	renderResetButton = () => {
		const { showControlsText, } = this.state;

		return (
			<span className={ styles.exerciseControls } onClick={ this.resetCode }>
				<span className={ styles.exerciseControlsIcon }>
					<Refresh/>
				</span>
				{ showControlsText && texts.controls.reset.text }
			</span>
		);
	}

	renderShowOutputButton = () => {
		const { showOutput, showControlsText, } = this.state;

		return (
			<span className={ styles.exerciseControls } onClick={ this.toggleOutput }>
				<span className={ styles.exerciseControlsIcon }>
					<DocumentLite/>
				</span>
				{ showControlsText && (showOutput ? texts.controls.output.hide : texts.controls.output.show) }
			</span>
		)
	}

	renderShowAcceptedSolutionsButton = () => {
		const { showAcceptedSolutionsWarning, showControlsText, } = this.state;

		return (
			<span className={ styles.exerciseControls } onClick={ this.showAcceptedSolutionsWarning }>
					<Tooltip
						onCloseClick={ this.hideAcceptedSolutionsWarning }
						pos={ "bottom left" }
						trigger={ showAcceptedSolutionsWarning ? "opened" : "closed" }
						render={
							() =>
								<span>
									{ texts.controls.acceptedSolutions.buildWarning() }
									<Button use={ "danger" } onClick={ this.showAcceptedSolutions }>
										{ texts.controls.acceptedSolutions.continue }
									</Button>
								</span>
						}>
						<span className={ styles.exerciseControlsIcon }>
							<EyeOpened/>
						</span>
						{ showControlsText && texts.controls.acceptedSolutions.text }
					</Tooltip>
				</span>
		);
	}

	renderHints = () => {
		const { showedHintsCount } = this.state;
		const { hints } = this.props;

		return (
			<ul className={ styles.hintsWrapper }>
				{ hints.slice(0, showedHintsCount)
					.map((h, i) =>
						<li key={ i }>
							<span className={ styles.hintBulb }><Lightbulb/></span>
							{ h }
						</li>
					) }
			</ul>
		)
	}

	renderAcceptedSolutions = () => {
		const { slideId, courseId, } = this.props;

		return (
			<Modal onClose={ this.closeAcceptedSolutions }>
				<Modal.Header>{ texts.acceptedSolutions.title }</Modal.Header>
				<Modal.Body>
					{ texts.acceptedSolutions.content }
					<DownloadedHtmlContent url={ constructPathToAcceptedSolutions(courseId, slideId) }/>
				</Modal.Body>
			</Modal>
		)
	}

	renderCongratsModal = ({ score, waitingForManualChecking, }) => {
		const { hideSolutions } = this.props;

		return (
			<CongratsModal
				showAcceptedSolutions={ !waitingForManualChecking && !hideSolutions && this.showAcceptedSolutions } // TODO требуется функция, а передается boolean
				score={ score }
				waitingForManualChecking={ waitingForManualChecking }
				onClose={ this.closeCongratsModal }
			/>
		);
	}

	showFirstComment = () => {
		//TODO
	}

	showFirstBotComment = () => {
		//TODO
	}

	selectComment = (e, id,) => {
		const { isEditable, selectedReviewId, } = this.state;
		e.stopPropagation();

		if(!isEditable && selectedReviewId !== id) {
			this.highlightReview(id);
		}
	}

	highlightReview = (id) => {
		const { currentReviews, selectedReviewId, editor, } = this.state;
		const newCurrentReviews = [...currentReviews];

		if(selectedReviewId >= 0) {
			const selectedReview = newCurrentReviews.find(r => r.id === selectedReviewId);
			const { from, to, } = selectedReview.marker.find();
			selectedReview.marker.clear();
			selectedReview.marker = this.highlightLine(to.line, to.ch, from.line, from.ch, styles.reviewCode);
		}

		let line = 0;
		if(id >= 0) {
			const review = newCurrentReviews.find(r => r.id === id);
			const { from, to, } = review.marker.find();
			review.marker.clear();
			review.marker = this.highlightLine(to.line, to.ch, from.line, from.ch, styles.selectedReviewCode);

			line = from.line;
		}

		this.setState({
			currentReviews: newCurrentReviews,
			selectedReviewId: id,
		}, () => {
			if(id >= 0) {
				editor.scrollIntoView({ line, }, 200);
			}
		});
	}

	highlightLine = (finishLine, finishPosition, startLine, startPosition, className) => {
		const { exerciseCodeDoc } = this.state;

		return exerciseCodeDoc.markText({
			line: startLine,
			ch: startPosition
		}, {
			line: finishLine,
			ch: finishPosition
		}, {
			className,
		});
	}

	renderEditButton = () => {
		return (
			<div className={ styles.editButton } onClick={ this.enableEditing }>
				{ texts.controls.edit.text }
			</div>
		)
	}

	renderShowStatisticsHint = () => {
		const { attemptedUsersCount, usersWithRightAnswerCount, lastSuccessAttemptDate, } = this.props.attemptsStatistics;
		const statisticsClassName = classNames(styles.exerciseControls, styles.statistics);

		return (
			<span className={ statisticsClassName }>
					<Tooltip pos={ "bottom right" } trigger={ "hover&focus" } render={
						() =>
							<span>
								{ texts.controls.statistics.buildStatistics(attemptedUsersCount, usersWithRightAnswerCount, lastSuccessAttemptDate) }
							</span>
					}>
						{ texts.controls.statistics.buildShortText(usersWithRightAnswerCount) }
					</Tooltip>
				</span>
		);
	}

	enableEditing = (e) => {
		e.stopPropagation();

		this.clearAllTextMarkers();

		this.setState({
			newTry: CodeMirror.createEmptyNewTry(),
			isEditable: true,
			valueChanged: true,
			currentSubmission: null,
			visibleCheckingResponse: null,
			currentReviews: [],
			showOutput: false
		})
	}

	showHint = () => {
		const { showedHintsCount, } = this.state;
		const { hints, } = this.props;

		this.setState({
			showedHintsCount: Math.min(showedHintsCount + 1, hints.length),
		})
	}

	resetCode = () => {
		const { exerciseInitialCode } = this.props;

		this.clearAllTextMarkers();

		this.setState({
			newTry: CodeMirror.createEmptyNewTry(),
			value: exerciseInitialCode,
			valueChanged: true,
			isEditable: true,
			currentSubmission: null,
			visibleCheckingResponse: null,
			currentReviews: [],
			showOutput: false
		})
	}

	clearAllTextMarkers = () => {
		const { currentReviews, } = this.state;

		currentReviews.forEach(({ marker }) => marker.clear());

		this.setState({
			selectedReviewId: -1,
		});
	}

	loadNewTry = () => {
		const { slideId } = this.props;

		this.resetCode();
		this.refreshPreviousDraft(slideId);
	}

	static
	createEmptyNewTry = () => {
		return { id: -1, caption: texts.submissions.newTry };
	}

	toggleOutput = () => {
		const { showOutput, } = this.state;

		this.setState({
			showOutput: !showOutput
		})
	}

	showAcceptedSolutionsWarning = () => {
		const { isSkipped, submissions, } = this.props;

		if(submissions.length > 0 || isSkipped) {
			this.showAcceptedSolutions();
		} else {
			this.setState({
				showAcceptedSolutionsWarning: true,
			});
		}
	}

	hideAcceptedSolutionsWarning = () => {
		this.setState({
			showAcceptedSolutionsWarning: false,
		})
	}

	showAcceptedSolutions = (e) => {
		this.setState({
			showAcceptedSolutions: true,
		})

		if(e) {
			e.stopPropagation();
		}

		this.hideAcceptedSolutionsWarning();
	}

	closeAcceptedSolutions = () => {
		this.setState({
			showAcceptedSolutions: false,
		})
	}

	closeCongratsModal = () => {
		this.setState({
			congratsModalData: null,
		})
	}

	sendExercise = () => {
		const { value, } = this.state;
		const { courseId, slideId, sendCode, } = this.props;

		this.setState({
			submissionLoading: true,
		});

		sendCode(courseId, slideId, value);
	}

	addReviewComment = (reviewId, text) => {
		const { addReviewComment, courseId, slideId, author, } = this.props;
		const { currentSubmission, } = this.state;

		const comment = {
			text,
			author,
			publishTime: new Date(),
		};

		addReviewComment(courseId, slideId, currentSubmission.id, reviewId, comment);
	}

	isSubmitResultsContainsError = ({ automaticChecking }) => {
		return automaticChecking.result === CheckingResult.CompilationError
			|| automaticChecking.result === CheckingResult.WrongAnswer;
	}

	onBeforeChange = (editor, data, value) => {
		this.setState({
			value,
			valueChanged: true,
		});
	}

	onEditorMount = (editor) => {
		editor.setSize('auto', '100%');
		this.setState({
			exerciseCodeDoc: editor.getDoc(),
			editor,
		})
	}

	onCursorActivity = () => {
		const { currentReviews, exerciseCodeDoc, isEditable, } = this.state;
		const cursor = exerciseCodeDoc.getCursor();

		if(!isEditable && currentReviews.length > 0) {
			const reviewId = CodeMirror.getSelectedReviewIdByCursor(currentReviews, exerciseCodeDoc, cursor);
			this.highlightReview(reviewId);
		}
	}

	static getSelectedReviewIdByCursor = (reviews, exerciseCodeDoc, cursor) => {
		const { line, ch } = cursor;
		const reviewsUnderCursor = reviews.filter(r =>
			r.startLine <= line && r.finishLine >= line
			&& !(r.startLine === line && ch < r.startPosition)
			&& !(r.finishLine === line && r.finishPosition < ch)
		);

		if(reviewsUnderCursor.length === 0) {
			return -1;
		}

		reviewsUnderCursor.sort((a, b) => {
			const aLength = CodeMirror.getReviewSelectionLength(a, exerciseCodeDoc);
			const bLength = CodeMirror.getReviewSelectionLength(b, exerciseCodeDoc);
			if(aLength !== bLength)
				return aLength - bLength;
			return a.startLine !== b.startLine
				? a.startLine - b.startLine
				: a.startPosition !== b.startPosition
					? a.startPosition - b.startPosition
					: a.timestamp - b.timestamp
		});

		return reviewsUnderCursor[0].id;
	}

	static
	getReviewSelectionLength = (review, exerciseCodeDoc) =>
		exerciseCodeDoc.indexFromPos({ line: review.finishLine, ch: review.finishPosition })
		- exerciseCodeDoc.indexFromPos({ line: review.startLine, ch: review.startPosition });

	static
	loadLanguageStyles = (language) => {
		switch (language.toLowerCase()) {
			case 'csharp':
				require('codemirror/mode/clike/clike');
				return `text/x-csharp`;
			case 'java':
				require('codemirror/mode/clike/clike');
				return `text/x-java`;

			case 'javascript':
				require('codemirror/mode/javascript/javascript');
				return `text/javascript`;
			case 'typescript':
				require('codemirror/mode/javascript/javascript');
				return `text/typescript`;
			case 'jsx':
				require('codemirror/mode/jsx/jsx');
				return `text/jsx`;

			case 'python2':
				require('codemirror/mode/python/python');
				return `text/x-python`;
			case 'python3':
				require('codemirror/mode/python/python');
				return `text/x-python`;

			case 'css':
				require('codemirror/mode/css/css');
				return `text/css`;

			default:
				require('codemirror/mode/xml/xml');
				return 'text/html';
		}
	}

	saveExerciseCodeDraft = (id) => {
		const { value, refreshPreviousDraftLastId, } = this.state;

		if(id === undefined) {
			id = refreshPreviousDraftLastId;
		}

		const solutions = JSON.parse(localStorage['exercise_solutions'] || '{}');
		solutions[id] = value;

		localStorage['exercise_solutions'] = JSON.stringify(solutions);
	}

	refreshPreviousDraft = (id) => {
		const { refreshPreviousDraftLastId, } = this.state;
		if(id === undefined) {
			id = refreshPreviousDraftLastId;
		}

		this.setState({
			refreshPreviousDraftLastId: id,
		})

		const solutions = JSON.parse(localStorage['exercise_solutions'] || '{}');

		if(solutions[id] !== undefined) {
			this.resetCode();
			this.setState({
				value: solutions[id],
			})
		}
	}
}

const mapStateToProps = (state, { courseId, slideId, }) => {
	const { slides, account, } = state;
	const { submissionsByCourses, } = slides;
	let { lastCheckingResponse, } = slides;

	if(!(lastCheckingResponse && lastCheckingResponse.courseId === courseId && lastCheckingResponse.slideId === slideId))
		lastCheckingResponse = null;

	const submissions = Object.values(submissionsByCourses[courseId][slideId])
		.filter((s, i, arr) =>
			(i === arr.length - 1)
			|| (!s.automaticChecking || s.automaticChecking.result === CheckingResult.RightAnswer))
		.map(s => ({ ...s, caption: texts.submissions.getSubmissionCaption(s) }));

	//newer is first
	submissions.sort((s1, s2) => (new Date(s2.timestamp) - new Date(s1.timestamp)));

	return {
		courseId,
		slideId,
		isAuthenticated: account.isAuthenticated,
		submissions,
		lastCheckingResponse,
		author: account,
	};
};

const mapDispatchToProps = (dispatch) => ({
	sendCode: (courseId, slideId, code) => dispatch(sendCode(courseId, slideId, code)),
	addReviewComment: (courseId, slideId, submissionId, reviewId, comment) => dispatch(addReviewComment(courseId, slideId, submissionId, reviewId, comment)),
});

CodeMirror.propTypes = {
	courseId: PropTypes.string,
	slideId: PropTypes.string,
	className: PropTypes.string,
	language: PropTypes.string.isRequired,
	code: PropTypes.string,
	isAuthenticated: PropTypes.bool,
	hideSolutions: PropTypes.bool,
	isSkipped: PropTypes.bool,
	sendCode: PropTypes.func,
	addCommentToReview: PropTypes.func,
	submissions: PropTypes.array,
	lastCheckingResponse: PropTypes.object,
	author: userType,
}

export default connect(mapStateToProps, mapDispatchToProps)(CodeMirror);
