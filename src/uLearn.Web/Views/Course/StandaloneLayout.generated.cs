﻿#pragma warning disable 1591
//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:4.0.30319.34209
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace uLearn.Web.Views.Course
{
    using System;
    using System.Collections.Generic;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Text;
    using System.Web;
    using System.Web.Helpers;
    using System.Web.Mvc;
    using System.Web.Mvc.Ajax;
    using System.Web.Mvc.Html;
    using System.Web.Routing;
    using System.Web.Security;
    using System.Web.UI;
    using System.Web.WebPages;
    using uLearn;
    using uLearn.Model.Blocks;
    using uLearn.Quizes;
    using uLearn.Web.Models;
    using uLearn.Web.Views.Course;
    using uLearn.Web.Views.SlideNavigation;
    
    [System.CodeDom.Compiler.GeneratedCodeAttribute("RazorGenerator", "2.0.0.0")]
    public static class StandaloneLayout
    {

public static System.Web.WebPages.HelperResult Page(Course course, Slide slide, TocModel toc, IEnumerable<string> cssFiles, IEnumerable<string> jsFiles)
{
return new System.Web.WebPages.HelperResult(__razor_helper_writer => {


 

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\t<html>\r\n\t<head>\r\n\t\t<title>Preview: ");


WebViewPage.WriteTo(@__razor_helper_writer, course.Title);

WebViewPage.WriteLiteralTo(@__razor_helper_writer, " — ");


WebViewPage.WriteTo(@__razor_helper_writer, slide.Title);

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "</title>\r\n\t\t<link rel=\"shortcut icon\" href=\"favicon.ico?v=1\" />\r\n\t\t<meta charset=" +
"\'UTF-8\'>\r\n");


 		foreach (var cssFile in cssFiles)
		{

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\t\t\t<link href=\'");


WebViewPage.WriteTo(@__razor_helper_writer, cssFile);

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\' rel=\'stylesheet\' />\r\n");


		}

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\t</head>\r\n\t<body>\r\n\t\t<div class=\'side-bar navbar-collapse collapse navbar-nav con" +
"tainer\'>\r\n\t\t\t");


WebViewPage.WriteTo(@__razor_helper_writer, TableOfContents.Toc(toc));

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\r\n\t\t</div>\r\n\r\n\t\t<div class=\"slide-container\">\r\n\t\t\t<div class=\"container body-cont" +
"ent\">\r\n\t\t\t\t<div class=\"row\">\r\n\t\t\t\t\t");


WebViewPage.WriteTo(@__razor_helper_writer, SlideHtml.Slide(new BlockRenderContext(course, slide, "/static/", 
						slide.Blocks.Select(
							(b, i) => b is ExerciseBlock 
								? new ExerciseBlockData { RunSolutionUrl = "/" + slide.Index.ToString("000") + ".html?query=submit", DebugView = true } 
								: b is AbstractQuestionBlock 
									? new QuizInfoModel(new QuizModel() {AnswersToQuizes = slide.Blocks.OfType<AbstractQuestionBlock>().ToDictionary(x => x.Id, x => new List<string>())}, b, i, QuizState.Debug) 
									: (dynamic)null
							).ToArray()
						)
					));

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\r\n\t\t\t\t</div>\r\n\t\t\t</div>\r\n\t\t</div>\r\n\r\n\r\n");


 		foreach (var jsFile in jsFiles)
		{

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\t\t\t<script src=\'");


WebViewPage.WriteTo(@__razor_helper_writer, jsFile);

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\'></script>\r\n");


		}

WebViewPage.WriteLiteralTo(@__razor_helper_writer, "\t</body>\r\n</html>\r\n");



});

}


    }
}
#pragma warning restore 1591
