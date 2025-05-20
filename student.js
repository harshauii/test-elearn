document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getCurrentUser(); // From app.js
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    const studentEmailDisplay = document.getElementById('studentEmail');
    if(studentEmailDisplay) studentEmailDisplay.textContent = currentUser.email;

    const enrolledCoursesListDiv = document.getElementById('enrolledCoursesList');
    const availableCoursesListDiv = document.getElementById('availableCoursesList');

    let userEnrolledCourses = {}; // To keep track of courses the student is enrolled in

    // --- Load Enrolled Courses ---
    function loadEnrolledCourses() {
        if (!enrolledCoursesListDiv) return;
        const userEnrollmentsRef = db.ref(`users/${currentUser.uid}/enrollments`);

        userEnrollmentsRef.on('value', enrollmentSnapshot => {
            enrolledCoursesListDiv.innerHTML = ''; // Clear previous list
            userEnrolledCourses = {}; // Reset

            if (enrollmentSnapshot.exists()) {
                const enrollmentPromises = [];
                enrollmentSnapshot.forEach(childSnapshot => {
                    const courseId = childSnapshot.key;
                    const enrollmentData = childSnapshot.val(); // e.g., { enrolledAt: timestamp, progress: 0 }
                    userEnrolledCourses[courseId] = true; // Mark as enrolled

                    // Fetch course details
                    const promise = db.ref(`courses/${courseId}`).once('value').then(courseSnap => {
                        if (courseSnap.exists()) {
                            return { id: courseId, ...courseSnap.val(), enrollmentData };
                        }
                        return null; // Course might have been deleted
                    });
                    enrollmentPromises.push(promise);
                });

                Promise.all(enrollmentPromises).then(courses => {
                    const validCourses = courses.filter(c => c !== null);
                    if (validCourses.length > 0) {
                        validCourses.forEach(course => {
                            const courseElement = document.createElement('div');
                            courseElement.classList.add('course-item');
                            // For "resume course", we're just showing it. Actual lesson tracking is more complex.
                            courseElement.innerHTML = `
                                <div>
                                    <h4>${course.name}</h4>
                                    <p>${course.description}</p>
                                    <small>Lessons: ${course.lessons}</small>
                                    <p><em>Enrolled. Click to resume (feature not fully implemented).</em></p>
                                </div>
                                <div class="actions">
                                    <button class="unenroll-btn" data-id="${course.id}">Unenroll</button>
                                </div>
                            `;
                            enrolledCoursesListDiv.appendChild(courseElement);
                        });
                         // Add event listeners for unenroll buttons
                        document.querySelectorAll('#enrolledCoursesList .unenroll-btn').forEach(button => {
                            button.addEventListener('click', handleUnenrollCourse);
                        });
                    } else {
                        enrolledCoursesListDiv.innerHTML = '<p>You have not enrolled in any courses yet.</p>';
                    }
                    // After loading enrolled courses, update the available courses list
                    loadAvailableCourses();
                });

            } else {
                enrolledCoursesListDiv.innerHTML = '<p>You have not enrolled in any courses yet.</p>';
                // After loading enrolled courses, update the available courses list
                loadAvailableCourses();
            }
        });
    }


    // --- Load Available Courses (excluding already enrolled ones) ---
    function loadAvailableCourses() {
        if (!availableCoursesListDiv) return;
        db.ref('courses').on('value', snapshot => {
            availableCoursesListDiv.innerHTML = ''; // Clear previous list
            if (snapshot.exists()) {
                let coursesAvailable = false;
                snapshot.forEach(childSnapshot => {
                    const courseId = childSnapshot.key;
                    const course = childSnapshot.val();

                    if (!userEnrolledCourses[courseId]) { // Only show if not already enrolled
                        coursesAvailable = true;
                        const courseElement = document.createElement('div');
                        courseElement.classList.add('course-item');
                        courseElement.innerHTML = `
                            <div>
                                <h4>${course.name}</h4>
                                <p>${course.description}</p>
                                <small>Lessons: ${course.lessons}</small>
                            </div>
                            <div class="actions">
                                <button class="enroll-btn" data-id="${courseId}">Enroll</button>
                            </div>
                        `;
                        availableCoursesListDiv.appendChild(courseElement);
                    }
                });

                if (!coursesAvailable && Object.keys(userEnrolledCourses).length > 0) {
                     availableCoursesListDiv.innerHTML = '<p>No other courses available or you are enrolled in all of them.</p>';
                } else if (!coursesAvailable) {
                    availableCoursesListDiv.innerHTML = '<p>No courses available at the moment.</p>';
                }


                // Add event listeners for enroll buttons
                document.querySelectorAll('#availableCoursesList .enroll-btn').forEach(button => {
                    button.addEventListener('click', handleEnrollCourse);
                });

            } else {
                availableCoursesListDiv.innerHTML = '<p>No courses available at the moment.</p>';
            }
        });
    }

    // --- Handle Course Enrollment ---
    function handleEnrollCourse(event) {
        const courseId = event.target.dataset.id;
        const userEnrollmentsRef = db.ref(`users/${currentUser.uid}/enrollments/${courseId}`);

        userEnrollmentsRef.set({
            enrolledAt: firebase.database.ServerValue.TIMESTAMP,
            progress: 0 // Initial progress, e.g., 0 out of 10 lessons
        })
        .then(() => {
            alert('Successfully enrolled in the course!');
            // loadEnrolledCourses and loadAvailableCourses will be re-triggered by their 'on' listeners.
        })
        .catch(error => {
            console.error('Error enrolling in course:', error);
            alert('Failed to enroll in the course.');
        });
    }

    // --- Handle Course Unenrollment ---
    function handleUnenrollCourse(event) {
        const courseId = event.target.dataset.id;
        if (confirm('Are you sure you want to unenroll from this course?')) {
            db.ref(`users/${currentUser.uid}/enrollments/${courseId}`).remove()
            .then(() => {
                alert('Successfully unenrolled from the course.');
                 // loadEnrolledCourses and loadAvailableCourses will be re-triggered by their 'on' listeners.
            })
            .catch(error => {
                console.error('Error unenrolling from course:', error);
                alert('Failed to unenroll from the course.');
            });
        }
    }


    // Initial load
    loadEnrolledCourses(); // This will then trigger loadAvailableCourses
});
