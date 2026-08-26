using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using AssignmentSyncMethods;
using System.Threading.Tasks;

namespace AssignmentSync_methods.Tests
{
    [TestClass]
    public class AccountConstructorTests
    {
        [TestMethod]
        public void Constructor_ValidInputs_InitializeCorrectly()
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);

            Assert.IsNotNull(m);
        }
        public void Constructor_InvalidInputs_ThrowsException()
        {
            try
            {
                var m = new Account("", "");
                Assert.Fail("Expected ArgumentException but no exception was thrown");
            }
            catch (ArgumentException)
            {
                // pass
            }
        }
    }
    [TestClass]
    public class MethodTests
    {
        [TestMethod]
        public async Task CourseCalendars_CorrectDates()
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);

            List<string> results = await m.returnCourseCalendars("2026", "S2");
            Assert.AreEqual(results[0], "COMP729_2026_S2 https://canvas.aut.ac.nz/feeds/calendars/course_FezTR30cX8GdWX1T9WHtV3zONvvGZswfu7VSgeSA.ics");
        }

        [TestMethod]
        public async Task CourseCalendars_InvalidDates()
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);
            try
            {
                await m.returnCourseCalendars("0000", "");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }

        [TestMethod]
        public async Task searchAssignmentByCourseCode_InvalidCode()
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);
            try
            {
                await m.searchAssignmentByCourseCode("");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }

        [TestMethod]
        public async Task searchAssignmentByCourseCode_CorrectCode()
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);

            List<string> results = await m.searchAssignmentByCourseCode("ENSE707");
            Assert.AreEqual(results[0], "Software Quality Assurance Project - Mid-Project Report - 2026-08-30");
        }
    }
}
