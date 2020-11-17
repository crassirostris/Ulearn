import React from "react";

import getPluralForm from "src/utils/getPluralForm";
import { AutomaticExerciseCheckingResult as CheckingResult } from "src/models/exercise.ts";

import moment from "moment";
import { convertDefaultTimezoneToLocal } from "src/utils/getMoment";

const texts = {
	submissions: {
		newTry: 'Новая попытка',
		getSubmissionCaption: (submission) => {
			if(!submission || submission.isNew) {
				return texts.submissions.newTry;
			}

			const { timestamp, automaticChecking, } = submission;

			const timestampCaption = texts.getSubmissionDate(timestamp);

			if(automaticChecking) {
				const { result } = automaticChecking;

				if(result === CheckingResult.CompilationError || result === CheckingResult.WrongAnswer) {
					return timestampCaption + ` (${ result })`;
				}
			}

			return timestampCaption;
		},
	},

	acceptedSolutions: {
		title: 'Решения',
		content: <p>Изучите решения ваших коллег. Проголосуйте за решения, в которых вы нашли что-то новое для
			себя.</p>,

	},

	mocks: {
		headerSuccess: 'Решение отправлено на ревью – 5 баллов. После ревью преподаватель поставит итоговый балл',
	},

	checkups: {
		showReview: 'Посмотреть',

		self: {
			title: 'Самопроверка',
			text: 'Посмотрите, всё ли вы учли и отметьте сделанное',

			checks: [
				'Проверьте оформление',
				'Проверьте, у всех полей и методов правильно выбраны модификаторы доступа.',
				'Метод точно работает корректно?',
			],
		},
		teacher: {
			title: 'Код-ревью',
			countTeacherReviews: (reviewsCount) => `Преподаватель оставил ${ reviewsCount } ${ getPluralForm(reviewsCount, 'комментарий', 'комментария', 'комментариев') }. `,
		},
		bot: {
			title: 'Ulearn Bot',
			countBotComments: (botCommentsLength) => `Бот нашёл ${ botCommentsLength } ${ getPluralForm(botCommentsLength, 'ошибку', 'ошибки', 'ошибок') }. `,
		},
	},

	controls: {
		submitCode: {
			text: 'Отправить',
			hint: 'Начните писать код',
		},
		hints: {
			text: 'Взять подсказку',
			hint: 'Подсказки закончились',
		},

		reset: {
			text: 'Начать сначала',
		},

		output: {
			show: 'Показать вывод',
			hide: 'Скрыть вывод',
		},

		acceptedSolutions: {
			text: 'Посмотреть решения',
			buildWarning: () => <React.Fragment>
				Вы не получите баллы за задачу,<br/>
				если посмотрите чужие решения.<br/>
				<br/>
			</React.Fragment>,
			continue: 'Всё равно посмотреть',
		},

		edit: {
			text: 'Редактировать',
		},

		showAllCode: {
			text: 'Показать код полностью',
		},

		statistics: {
			buildShortText: (usersWithRightAnswerCount) =>
				<React.Fragment>Решило: { usersWithRightAnswerCount }</React.Fragment>,
			buildStatistics: (attemptedUsersCount, usersWithRightAnswerCount, lastSuccessAttemptDate) =>
				lastSuccessAttemptDate
					? <React.Fragment>
						За всё время:<br/>
						{ attemptedUsersCount } { getPluralForm(attemptedUsersCount, 'студент пробовал', 'студента пробовали', 'студентов пробовали') } решить
						задачу.<br/>
						{ getPluralForm(attemptedUsersCount, 'Решил', 'Решили', 'Решили') } { usersWithRightAnswerCount }
						<br/>
						<br/>
						Последний раз решили { moment(lastSuccessAttemptDate).startOf("minute").fromNow() }
					</React.Fragment>
					: 'Эту задачу ещё никто не решал',
		},
	},

	getSubmissionDate: (timestamp) => {
		return convertDefaultTimezoneToLocal(timestamp).format('DD MMMM YYYY в HH:mm');
	}
};

export default texts;
