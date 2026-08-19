using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using AssignmentSyncMethods;

namespace assignmentsync_test_C_
{
    class Program
    {
        public static async Task Main(string[] args)
        {
            const string TOKEN = "19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D";
            var m = new Account("canvas.aut.ac.nz", TOKEN);

            //await m.getCourses();
            //await m.returnCourseCalendars("2026", "S2");

            //var assignments = await m.getAssignments();
            //foreach (var name in assignments)
            //{
            //    Console.WriteLine(name);
            //}

            var assignments = await m.searchAssignmentByCourseCode("COMP703");
            foreach (var x in assignments)
            {
                Console.WriteLine(x);
            }
        }
    }
}
