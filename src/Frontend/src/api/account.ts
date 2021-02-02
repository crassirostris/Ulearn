import { Dispatch } from "redux";
import api from "src/api";
import { AccountInfo, LogoutInfo, RolesInfo } from "src/models/account";
import { accountInfoUpdateAction, rolesUpdateAction } from "src/actions/account";

export function getCurrentUser() {
	return (dispatch: Dispatch): Promise<void> => {
		return api.get<AccountInfo>('account')
			.then(json => {
				const isAuthenticated = json.isAuthenticated;
				if(isAuthenticated) {
					dispatch(accountInfoUpdateAction(json));
					api.account.getRoles()(dispatch);
				} else {
					dispatch(accountInfoUpdateAction({ isAuthenticated: false }));
				}
			})
			.catch(error => {
				if(error.response && error.response.status === 401) { // Unauthorized
					dispatch(accountInfoUpdateAction({ isAuthenticated: false }));
				}
			});
	};
}

export function getRoles() {
	return (dispatch: Dispatch): Promise<void> => {
		return api.get<RolesInfo>('account/roles')
			.then(json => {
				dispatch(rolesUpdateAction(json));
			});
	};
}

export function logout() {
	return (): Promise<void> => {
		return api.post<LogoutInfo>('account/logout')
			.then(json => {
				if(json.logout) {
					localStorage.removeItem('exercise_solutions');
					api.clearApiJwtToken();
					redirectToMainPage();
				}
			});

		function redirectToMainPage() {
			const parser = document.createElement('a');
			parser.href = window.location.href;
			window.location.href = parser.protocol + "//" + parser.host;
		}
	};
}