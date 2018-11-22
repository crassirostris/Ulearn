﻿using System;
using System.IO;
using NUnit.Framework;
using Ulearn.Common.Extensions;
using Ulearn.Core.Courses;
using Ulearn.Core.Courses.Slides;
using Ulearn.Core.Courses.Slides.Quizzes;
using Ulearn.Core.Courses.Slides.Quizzes.Blocks;
using Ulearn.Core.Courses.Units;

namespace Ulearn.Core.Tests.Courses.Slides
{
    [TestFixture]
    public class XmlSlideLoaderTests
    {
        private const string testDataDirectory = "Courses/Slides/TestData/";
		
        private XmlSlideLoader loader;
		
        private CourseSettings courseSettings;
        private Unit unit;

        [OneTimeSetUp]
        public void OneTimeSetUp()
        {
            loader = new XmlSlideLoader();
            courseSettings = new CourseSettings(CourseSettings.DefaultSettings);
            courseSettings.Scoring.Groups.Add("ScoringGroup1", new ScoringGroup { Id = "ScoringGroup1" });
            unit = new Unit(UnitSettings.CreateByTitle("Unit title", courseSettings), new DirectoryInfo("."));
        }

        [SetUp]
        public void SetUp()
        {
            Directory.SetCurrentDirectory(TestContext.CurrentContext.TestDirectory);
        }

        private Slide LoadSlideFromXmlFile(string filename)
		{
			var slideFile = new DirectoryInfo(testDataDirectory).GetFile(filename);
			return loader.Load(slideFile, 1, unit, "CourseId", courseSettings);
		}

        [Test]
        public void LoadEmptySlide()
        {
            Assert.AreEqual(0, LoadSlideFromXmlFile("EmptySlide.xml").Blocks.Length);
        }

        [Test]
        public void LoadSimpleSlideWithMarkdownBlocks()
        {
            var slide = LoadSlideFromXmlFile("SimpleSlideWithMarkdownBlocks.xml");
			
            Assert.AreEqual(6, slide.Blocks.Length);
            Assert.AreEqual(Guid.Parse("C6A70E4D-9673-4D02-A50C-FE667A5BD83D"), slide.Id);
            Assert.AreEqual("Simple slide", slide.Title);
        }

        [Test]
        public void LoadEmptyQuiz()
        {
            Assert.AreEqual(typeof (QuizSlide), LoadSlideFromXmlFile("EmptyQuiz.xml").GetType());
        }

        [Test]
        public void LoadQuizWithScoringSettings()
        {
            var quizSlide = (QuizSlide) LoadSlideFromXmlFile("QuizWithScoringSettings.xml");
			
            Assert.AreEqual("ScoringGroup1", quizSlide.Scoring.ScoringGroup);
            Assert.AreEqual(10, quizSlide.Scoring.MaxTriesCount);
            Assert.AreEqual(true, quizSlide.Scoring.ManualChecking);
        }

        [Test]
        public void LoadSlideWithWrongBlockShouldFail()
        {
            Assert.Catch<CourseLoadingException>(() => LoadSlideFromXmlFile("SlideWithWrongBlock.xml"));
        }

        [Test]
        public void LoadQuizWithSomeBlocks()
        {
            var quizSlide = (QuizSlide) LoadSlideFromXmlFile("QuizWithSomeBlocks.xml");
			
            Assert.AreEqual(3, quizSlide.Blocks.Length);
            Assert.AreEqual(5, quizSlide.MaxScore);
            Assert.AreEqual("Внимание, вопрос!", ((AbstractQuestionBlock) quizSlide.Blocks[0]).Text);
            CollectionAssert.AreEqual(new RegexInfo[1] { new RegexInfo { Pattern = "\\d+" } }, ((FillInBlock) quizSlide.Blocks[0]).Regexes);
        }

        [Test]
        public void LoadEmptyExerciseShouldFail()
        {
            Assert.Catch<CourseLoadingException>(() => LoadSlideFromXmlFile("EmptyExercise.xml"));
        }
    }
}
