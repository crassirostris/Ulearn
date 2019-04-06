﻿using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using NHunspell;
using Ulearn.Common.Extensions;
using Ulearn.Core.CSharp;
using Ulearn.Core.CSharp.Validators;
using Ulearn.Core.Properties;

namespace uLearn.CSharp.Validators.SpellingValidator
{
	public class SpellingValidator: BaseStyleValidator
	{
		private static readonly Hunspell hunspell = new Hunspell(Resources.en_US_aff, Resources.en_US_dic);
		private static readonly HashSet<string> wordsToExcept = new HashSet<string>
		{
			"func", "arg", "args", "pos", "sw", "bmp", "prev", "next", "rnd", "ui", "autocomplete", "tuple", "len", "api", "tuples", "vm",
			"ai"
		};
		
		public override List<SolutionStyleError> FindErrors(SyntaxTree userSolution, SemanticModel semanticModel)
		{	
			return InspectAll<MethodDeclarationSyntax>(userSolution, InspectMethodsNamesAndArguments)
				.Concat(InspectAll<VariableDeclarationSyntax>(userSolution, semanticModel, InspectVariablesNames))
				.Concat(InspectAll<PropertyDeclarationSyntax>(userSolution, InspectPropertiesNames))
				.ToList();
		}

		private IEnumerable<SolutionStyleError> InspectMethodsNamesAndArguments(MethodDeclarationSyntax methodDeclaration)
		{
			var methodIdentifier = methodDeclaration.Identifier;
			var errorsInParameters = InspectMethodParameters(methodDeclaration);

			return CheckIdentifierNameForSpellingErrors(methodIdentifier).Concat(errorsInParameters);
		}

		private List<SolutionStyleError> InspectMethodParameters(MethodDeclarationSyntax methodDeclaration)
		{
			var parameters = methodDeclaration.ParameterList.Parameters;
			return parameters
				.Select(InspectMethodParameter)
				.Where(err => err != null)
				.ToList();
		}

		private SolutionStyleError InspectMethodParameter(ParameterSyntax parameter)
		{
			var identifier = parameter.Identifier;
			var identifierText = identifier.Text;
			var errorsInParameterName = CheckIdentifierNameForSpellingErrors(identifier);
			foreach (var errorInParameterName in errorsInParameterName)
			{
				var parameterTypeAsString = parameter.Type.ToString();
				if (!parameterTypeAsString.StartsWith(identifierText, StringComparison.InvariantCultureIgnoreCase)
					|| identifierText.Equals(parameterTypeAsString.MakeTypeNameAbbreviation(), StringComparison.InvariantCultureIgnoreCase))
					return errorInParameterName;
			}

			return null;
		}

		private IEnumerable<SolutionStyleError> InspectVariablesNames(VariableDeclarationSyntax variableDeclarationSyntax, SemanticModel semanticModel)
		{
			var typeInfo = semanticModel.GetTypeInfo(variableDeclarationSyntax.Type);
			return variableDeclarationSyntax.Variables.SelectMany(v => InspectVariablesNames(v, typeInfo));
		}

		private IEnumerable<SolutionStyleError> InspectVariablesNames(VariableDeclaratorSyntax variableDeclaratorSyntax, TypeInfo variableTypeInfo)
		{
			var variableIdentifier = variableDeclaratorSyntax.Identifier;
			var variableType = variableTypeInfo.Type;
			var variableTypeName = variableType.Name;
			var variableName = variableIdentifier.Text;
			if (variableTypeName.StartsWith(variableName, StringComparison.InvariantCultureIgnoreCase)
				|| variableTypeName.MakeTypeNameAbbreviation().Equals(variableName, StringComparison.InvariantCultureIgnoreCase))
				return new List<SolutionStyleError>();
			
			return CheckIdentifierNameForSpellingErrors(variableIdentifier);
		}

		private IEnumerable<SolutionStyleError> InspectPropertiesNames(PropertyDeclarationSyntax propertyDeclaration)
		{
			var propertyType = propertyDeclaration.Type;
			var propertyTypeAsString = propertyType.ToString();
			var propertyName = propertyDeclaration.Identifier.Text;
			if (propertyTypeAsString.StartsWith(propertyName, StringComparison.InvariantCultureIgnoreCase)
				|| propertyTypeAsString.MakeTypeNameAbbreviation().Equals(propertyName, StringComparison.InvariantCultureIgnoreCase))
				return new List<SolutionStyleError>();
			
			return CheckIdentifierNameForSpellingErrors(propertyDeclaration.Identifier);
		}

		private IEnumerable<SolutionStyleError> CheckIdentifierNameForSpellingErrors(SyntaxToken identifier)
		{
			var wordsInIdentifier = identifier.ValueText.SplitByCamelCase();
			foreach (var word in wordsInIdentifier)
			{
				var wordForCheck = RemoveIfySuffix(word.ToLowerInvariant());
				if (!wordsToExcept.Contains(wordForCheck) && !hunspell.Spell(wordForCheck))
				{
					var possibleErrorInWord = CheckConcatenatedWordsInLowerCaseForError(wordForCheck, identifier);
					if (possibleErrorInWord != null)
						yield return possibleErrorInWord;
				}
			}
		}

		private string RemoveIfySuffix(string word)
		{
			return word.LastIndexOf("ify", StringComparison.InvariantCultureIgnoreCase) > 0
				? word.Substring(0, word.Length - 3)
				: word;
		}

		private SolutionStyleError CheckConcatenatedWordsInLowerCaseForError(string concatenatedWords, SyntaxToken tokenWithConcatenatedWords)
		{
			var currentCheckingWord = "";
			foreach (var symbol in concatenatedWords)
			{
				currentCheckingWord += symbol;
				if (currentCheckingWord == "I" || currentCheckingWord.Length != 1 && hunspell.Spell(currentCheckingWord))
					currentCheckingWord = "";
			}

			return currentCheckingWord != ""
				? new SolutionStyleError(StyleErrorType.Misspeling01, tokenWithConcatenatedWords, $"В слове {concatenatedWords} допущена опечатка.")
				: null;
		}
	}
}