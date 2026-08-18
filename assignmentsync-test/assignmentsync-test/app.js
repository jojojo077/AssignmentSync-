const TOKEN = '19361~nnc8XwG7K86HEFueCXftm8c4DXVZWZwzChaTPUAz6ZHD3y8Kue4k23wHY9Dc3T7D';

async function getCourses() {
    const response = await fetch('https://canvas.aut.ac.nz/api/v1/courses?per_page=100', {
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        }
    });

    const courses = await response.json();

    courses.forEach(course => {
        console.log(`${course.name} (${course.course_code}) - ID: ${course.id}`);
    });

    
    console.log('################################################################################');
    // retrieve current year courses ICS file
    const calendar_list = [];
    courses.forEach(course => {
        if (course.name !== "undefined" && course.course_code) {
            if (course.course_code.includes("2026") && course.course_code.includes("S2")) {
                calendar_list.push(course.course_code + " " + course.calendar.ics);
            }
        }
        
    });
    calendar_list.forEach(element => {
        console.log(element);
    });
    console.log('################################################################################');
    // search assignments in course
    const courseCodeSearch = "ENSE707";
    courses.forEach(course => {
        if (course.name !== "undefined" && course.course_code) {

        }
    })
}

getCourses();