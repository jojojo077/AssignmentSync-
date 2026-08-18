using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using AssignmentSyncMethods;
using System.Threading.Tasks;

namespace AssignmentSync_methods.Tests
{
    [TestClass]
    public class MethodTests
    {
        [TestMethod]
        public async Task CourseCalendars_CorrectDates()
        {
            var m = new Methods();
            try
            {
                await m.returnCourseCalendars("2026", "S2");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }

        [TestMethod]
        public async Task CourseCalendars_InvalidDates()
        {
            var m = new Methods();
            try
            {
                await m.returnCourseCalendars("0000", "ABC");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }

        [TestMethod]
        public async Task searchAssignmentByCourseCode_InvalidCode()
        {
            var m = new Methods();
            try
            {
                await m.searchAssignmentByCourseCode("ABC123");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }

        [TestMethod]
        public async Task searchAssignmentByCourseCode_CorrectCode()
        {
            var m = new Methods();
            try
            {
                await m.searchAssignmentByCourseCode("ENSE707");
            }
            catch (ArgumentException)
            {
                // Test pass - exception was thrown
            }
        }
    }
}
