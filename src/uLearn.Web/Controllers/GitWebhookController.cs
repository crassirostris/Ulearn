using System;
using System.Linq;
using System.Net;
using System.Runtime.Serialization;
using System.Security.Cryptography;
using System.Text;
using System.Web.Http;
using System.Threading.Tasks;
using System.Web.Configuration;
using System.Web.Mvc;
using Newtonsoft.Json;

namespace uLearn.Web.Controllers
{

	public class GitWebhookController : ApiController
	{
		private readonly string gitSecret;
		
		public GitWebhookController()
		{
			gitSecret = WebConfigurationManager.AppSettings["webhook.git.secret"];
		}
		
		[System.Web.Http.HttpPost]
		[System.Web.Http.Route("CourseWebhook")]
		public async Task<ActionResult> GithubWebhook()
		{
			string githubEventName = null;
			if (Request.Headers.TryGetValues("X-GitHub-Event", out var githubEventNames))
				githubEventName = githubEventNames.FirstOrDefault();
			string gitlabEventName = null;
			if (Request.Headers.TryGetValues("X-Gitlab-Event", out var gitlabEventNames))
				gitlabEventName = gitlabEventNames.FirstOrDefault();
			if (!string.IsNullOrWhiteSpace(githubEventName))
				return await ProcessGithubRequest(githubEventName).ConfigureAwait(false);
			if (!string.IsNullOrWhiteSpace(gitlabEventName))
				return await ProcessGitlabRequest(gitlabEventName).ConfigureAwait(false);
		}

		public async Task<ActionResult> ProcessGithubRequest(string eventName)
		{
			if(eventName != "push")
				return new HttpStatusCodeResult(HttpStatusCode.OK);
			string signature = null;
			if (Request.Headers.TryGetValues("X-Hub-Signature", out var signatures))
				signature = signatures.FirstOrDefault();
			var jsonContent = await Request.Content.ReadAsStringAsync().ConfigureAwait(false);
			if (!IsValidGithubRequest(jsonContent, eventName, signature))
				return new HttpStatusCodeResult(HttpStatusCode.Forbidden);
			var content = JsonConvert.DeserializeObject<GithubPushData>(jsonContent);
			if (content.Ref != "refs/heads/master")
				return new HttpStatusCodeResult(HttpStatusCode.OK);
			var url = content.Repository.SshUrl;
			await UpdateRepo(url).ConfigureAwait(false);
			return new HttpStatusCodeResult(HttpStatusCode.OK);
		}

		public async Task<ActionResult> ProcessGitlabRequest(string eventName)
		{
			if(eventName != "Push Hook")
				return new HttpStatusCodeResult(HttpStatusCode.OK);
			string token = null;
			if (Request.Headers.TryGetValues("X-Gitlab-Token", out var signatures))
				token = signatures.FirstOrDefault();
			if (token != gitSecret)
				return new HttpStatusCodeResult(HttpStatusCode.Forbidden);
			var jsonContent = await Request.Content.ReadAsStringAsync().ConfigureAwait(false);
			var content = JsonConvert.DeserializeObject<GitlabPushData>(jsonContent);
			if (content.Ref != "refs/heads/master")
				return new HttpStatusCodeResult(HttpStatusCode.OK);
			var url = content.Repository.SshUrl;
			await UpdateRepo(url).ConfigureAwait(false);
			return new HttpStatusCodeResult(HttpStatusCode.OK);
		}

		private async Task UpdateRepo(string url)
		{
			throw new NotImplementedException();
		}
		
		private bool IsValidGithubRequest(string payload, string eventName, string signatureWithPrefix)
		{
			if (string.IsNullOrWhiteSpace(payload))
			{
				throw new ArgumentNullException(nameof(payload));
			}
			if (string.IsNullOrWhiteSpace(eventName))
			{
				throw new ArgumentNullException(nameof(eventName));
			}
			if (string.IsNullOrWhiteSpace(signatureWithPrefix))
			{
				throw new ArgumentNullException(nameof(signatureWithPrefix));
			}

			const string sha1Prefix = "sha1=";
			if (!signatureWithPrefix.StartsWith(sha1Prefix, StringComparison.OrdinalIgnoreCase))
				return false;
			
			var signature = signatureWithPrefix.Substring(sha1Prefix.Length);
			var secret = Encoding.ASCII.GetBytes(gitSecret);
			var payloadBytes = Encoding.ASCII.GetBytes(payload);

			using (var hmSha1 = new HMACSHA1(secret))
			{
				var hash = hmSha1.ComputeHash(payloadBytes);

				var hashString = ToHexString(hash);

				if (hashString.Equals(signature))
				{
					return true;
				}
			}

			return false;
		}

		public static string ToHexString(byte[] bytes)
		{
			var builder = new StringBuilder(bytes.Length * 2);
			foreach (byte b in bytes)
			{
				builder.AppendFormat("{0:x2}", b);
			}

			return builder.ToString();
		}
	}
	
	[DataContract]
	internal class GithubPushData
	{
		[DataMember(Name = "ref")] public string Ref;
		[DataMember(Name = "repository")] public GithubRepository Repository;
	}

	[DataContract]
	internal class GithubRepository
	{
		[DataMember(Name = "ssh_url")] public string SshUrl;
	}
	
	[DataContract]
	internal class GitlabPushData
	{
		[DataMember(Name = "ref")] public string Ref;
		[DataMember(Name = "repository")] public GitlabRepository Repository;
	}
	
	[DataContract]
	internal class GitlabRepository
	{
		[DataMember(Name = "git_ssh_url")] public string SshUrl;
	}
}