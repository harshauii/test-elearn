document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getCurrentUser(); // From app.js
    if (!currentUser) {
        // Should be handled by onAuthStateChanged, but as a fallback
        window.location.href = 'index.html';
        return;
    }

    const adminEmailDisplay = document.getElementById('adminEmail');
    if (adminEmailDisplay) adminEmailDisplay.textContent = currentUser.email;

    const courseFormContainer = document.getElementById('course-form-container');
    const courseNameInput = document.getElementById('courseName');
    const courseDescriptionInput = document.getElementById('courseDescription');
    const saveCourseButton = document.getElementById('saveCourseButton');
    const clearCourseFormButton = document.getElementById('clearCourseFormButton');
    const courseIdInput = document.getElementById('courseId'); // Hidden input for editing
    const courseListDiv = document.getElementById('courseList');
    const userListDiv = document.getElementById('userList');

    // --- Course Management ---

    function clearCourseForm() {
        courseIdInput.value = '';
        courseNameInput.value = '';
        courseDescriptionInput.value = '';
        saveCourseButton.textContent = 'Save Course';
        clearCourseFormButton.style.display = 'none';
        courseNameInput.focus();
    }

    if (clearCourseFormButton) {
        clearCourseFormButton.addEventListener('click', clearCourseForm);
    }

    if (saveCourseButton) {
        saveCourseButton.addEventListener('click', () => {
            const courseName = courseNameInput.value.trim();
            const courseDescription = courseDescriptionInput.value.trim();
            const courseId = courseIdInput.value;

            if (!courseName || !courseDescription) {
                alert('Please fill in both course name and description.');
                return;
            }

            const courseData = {
                name: courseName,
                description: courseDescription,
                lessons: 10, // As per requirement
                createdBy: currentUser.uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            if (courseId) {
                // Update existing course
                db.ref('courses/' + courseId).update(courseData)
                    .then(() => {
                        alert('Course updated successfully!');
                        clearCourseForm();
                        loadCourses();
                    })
                    .catch(error => console.error('Error updating course:', error));
            } else {
                // Create new course
                const newCourseRef = db.ref('courses').push();
                newCourseRef.set(courseData)
                    .then(() => {
                        alert('Course created successfully!');
                        clearCourseForm();
                        loadCourses();
                    })
                    .catch(error => console.error('Error creating course:', error));
            }
        });
    }

    function loadCourses() {
        if (!courseListDiv) return;
        db.ref('courses').on('value', snapshot => {
            courseListDiv.innerHTML = '<h3>Existing Courses</h3>'; // Reset list
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const courseId = childSnapshot.key;
                    const course = childSnapshot.val();
                    const courseElement = document.createElement('div');
                    courseElement.classList.add('course-item');
                    courseElement.innerHTML = `
                        <div>
                            <h4>${course.name}</h4>
                            <p>${course.description}</p>
                            <small>Lessons: ${course.lessons}</small>
                        </div>
                        <div class="actions">
                            <button class="edit-btn" data-id="${courseId}">Edit</button>
                            <button class="delete-btn" data-id="${courseId}">Delete</button>
                        </div>
                    `;
                    courseListDiv.appendChild(courseElement);
                });

                // Add event listeners for edit/delete buttons
                document.querySelectorAll('.edit-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        db.ref('courses/' + id).once('value').then(snap => {
                            const course = snap.val();
                            courseIdInput.value = id;
                            courseNameInput.value = course.name;
                            courseDescriptionInput.value = course.description;
                            saveCourseButton.textContent = 'Update Course';
                            clearCourseFormButton.style.display = 'inline-block';
                            courseNameInput.focus();
                            window.scrollTo(0, courseFormContainer.offsetTop - 20); // Scroll to form
                        });
                    });
                });

                document.querySelectorAll('.delete-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        if (confirm('Are you sure you want to delete this course?')) {
                            db.ref('courses/' + id).remove()
                                .then(() => alert('Course deleted.'))
                                .catch(error => console.error('Error deleting course:', error));
                            // The 'on' listener will auto-refresh the list.
                        }
                    });
                });
            } else {
                courseListDiv.innerHTML += '<p>No courses found.</p>';
            }
        });
    }

    // --- User Management (Role Change) ---
    function loadUsers() {
        if (!userListDiv) return;
        db.ref('users').on('value', snapshot => {
            userListDiv.innerHTML = ''; // Reset list
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const userId = childSnapshot.key;
                    const user = childSnapshot.val();

                    // Don't allow admin to change their own role via this UI for simplicity
                    // or the default admin
                    if (user.email === adminEmail || userId === currentUser.uid) {
                       // Optionally display them without role change option
                        const userElement = document.createElement('div');
                        userElement.classList.add('user-item');
                        userElement.innerHTML = `
                            <div>
                                <p><strong>${user.displayName || user.email}</strong> (${user.role})</p>
                                ${user.email === adminEmail ? '<small>(Default Admin)</small>' : ''}
                            </div>
                            <div class="actions">
                                </div>
                        `;
                        userListDiv.appendChild(userElement);
                        return;
                    }


                    const userElement = document.createElement('div');
                    userElement.classList.add('user-item');
                    userElement.innerHTML = `
                        <div>
                            <p><strong>${user.displayName || user.email}</strong></p>
                            <p>Current Role: ${user.role}</p>
                        </div>
                        <div class="actions">
                            <select id="role-${userId}">
                                <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                            <button class="change-role-btn" data-id="${userId}">Change Role</button>
                        </div>
                    `;
                    userListDiv.appendChild(userElement);
                });

                // Add event listeners for change role buttons
                document.querySelectorAll('.change-role-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userIdToChange = e.target.dataset.id;
                        const newRole = document.getElementById(`role-${userIdToChange}`).value;
                        if (confirm(`Change role for this user to ${newRole}?`)) {
                            db.ref('users/' + userIdToChange + '/role').set(newRole)
                                .then(() => alert('User role updated.'))
                                .catch(error => console.error('Error updating role:', error));
                            // The 'on' listener will auto-refresh the list.
                        }
                    });
                });

            } else {
                userListDiv.innerHTML = '<p>No users found.</p>';
            }
        });
    }

    // Initial loads
    loadCourses();
    loadUsers();
});
