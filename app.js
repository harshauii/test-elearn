// Firebase Configuration (Replace with your own)
const firebaseConfig = {
  apiKey: "AIzaSyAKz4LhJcThTJ1ZowKYMV7rVlKwDhuXz3g",
  authDomain: "rolebased-test-1.firebaseapp.com",
  databaseURL: "https://rolebased-test-1-default-rtdb.firebaseio.com",
  projectId: "rolebased-test-1",
  storageBucket: "rolebased-test-1.firebasestorage.app",
  messagingSenderId: "951301430114",
  appId: "1:951301430114:web:17cae16a755c2cbc086a3b",
  measurementId: "G-CFC2EF9MQF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginPage = document.getElementById('login-page');
const dashboard = document.getElementById('dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const studentDashboard = document.getElementById('student-dashboard');
const googleSignInButton = document.getElementById('google-signin');
const signOutButton = document.getElementById('sign-out');
const createCourseButton = document.getElementById('create-course');
const courseNameInput = document.getElementById('course-name');
const courseListAdmin = document.getElementById('course-list-admin');
const courseListStudent = document.getElementById('course-list-student');
const roleUserSelect = document.getElementById('role-user-select');
const changeRoleButton = document.getElementById('change-role');

// Google Sign-In
googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .catch(error => console.error('Sign-in Error:', error));
});

// Sign Out
signOutButton.addEventListener('click', () => {
    auth.signOut();
});

// Authentication State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        loginPage.style.display = 'none';
        dashboard.style.display = 'block';
        setupUser(user);
    } else {
        loginPage.style.display = 'block';
        dashboard.style.display = 'none';
        adminDashboard.style.display = 'none';
        studentDashboard.style.display = 'none';
    }
});

// Setup User and Role
function setupUser(user) {
    const defaultAdminEmail = 'akjhsrao@gmail.com';
    db.collection('users').doc(user.uid).get()
        .then(doc => {
            if (!doc.exists) {
                // New user: Assign role
                const role = user.email === defaultAdminEmail ? 'admin' : 'student';
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: role
                });
                displayDashboard(role);
            } else {
                displayDashboard(doc.data().role);
            }
            if (doc.data()?.role === 'admin') loadUsersForRoleChange();
        })
        .catch(error => console.error('Error checking user:', error));
}

// Display Dashboard Based on Role
function displayDashboard(role) {
    if (role === 'admin') {
        adminDashboard.style.display = 'block';
        studentDashboard.style.display = 'none';
        loadCoursesAdmin();
    } else {
        adminDashboard.style.display = 'none';
        studentDashboard.style.display = 'block';
        loadCoursesStudent();
    }
}

// Load Users for Role Change (Admin Only)
function loadUsersForRoleChange() {
    db.collection('users').get()
        .then(snapshot => {
            roleUserSelect.innerHTML = '';
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${doc.data().email} (${doc.data().role})`;
                roleUserSelect.appendChild(option);
            });
        });
}

// Change Role (Admin Only)
changeRoleButton.addEventListener('click', () => {
    const userId = roleUserSelect.value;
    db.collection('users').doc(userId).get()
        .then(doc => {
            const currentRole = doc.data().role;
            const newRole = currentRole === 'admin' ? 'student' : 'admin';
            db.collection('users').doc(userId).update({ role: newRole })
                .then(() => loadUsersForRoleChange());
        });
});

// Admin: Load Courses
function loadCoursesAdmin() {
    db.collection('courses').get()
        .then(snapshot => {
            courseListAdmin.innerHTML = '';
            snapshot.forEach(doc => {
                const course = doc.data();
                const div = document.createElement('div');
                div.innerHTML = `
                    ${course.name}
                    <button onclick="editCourse('${doc.id}')">Edit</button>
                    <button onclick="deleteCourse('${doc.id}')">Delete</button>
                `;
                courseListAdmin.appendChild(div);
            });
        });
}

// Admin: Create Course
createCourseButton.addEventListener('click', () => {
    const courseName = courseNameInput.value.trim();
    if (courseName) {
        const lessons = Array.from({ length: 10 }, (_, i) => ({
            title: `Lesson ${i + 1}`,
            content: `Content for Lesson ${i + 1}`
        }));
        db.collection('courses').add({
            name: courseName,
            lessons: lessons
        }).then(() => {
            courseNameInput.value = '';
            loadCoursesAdmin();
        });
    }
});

// Admin: Edit Course
window.editCourse = function(courseId) {
    const newName = prompt('Enter new course name:');
    if (newName) {
        db.collection('courses').doc(courseId).update({ name: newName })
            .then(() => loadCoursesAdmin());
    }
};

// Admin: Delete Course
window.deleteCourse = function(courseId) {
    if (confirm('Are you sure?')) {
        db.collection('courses').doc(courseId).delete()
            .then(() => loadCoursesAdmin());
    }
};

// Student: Load Courses
function loadCoursesStudent() {
    db.collection('courses').get()
        .then(snapshot => {
            courseListStudent.innerHTML = '';
            snapshot.forEach(doc => {
                const course = doc.data();
                const div = document.createElement('div');
                div.innerHTML = `
                    ${course.name}
                    <button onclick="enrollCourse('${doc.id}')">Enroll</button>
                    <button onclick="resumeCourse('${doc.id}')">Resume</button>
                `;
                courseListStudent.appendChild(div);
            });
        });
}

// Student: Enroll in Course
window.enrollCourse = function(courseId) {
    const user = auth.currentUser;
    db.collection('enrollments').doc(`${user.uid}_${courseId}`).set({
        userId: user.uid,
        courseId: courseId,
        progress: 0
    }).then(() => alert('Enrolled successfully!'));
};

// Student: Resume Course
window.resumeCourse = function(courseId) {
    const user = auth.currentUser;
    db.collection('enrollments').doc(`${user.uid}_${courseId}`).get()
        .then(doc => {
            if (doc.exists) {
                const progress = doc.data().progress;
                alert(`Resuming ${courseId} at Lesson ${progress + 1}`);
                // Here you could expand to show course content
            } else {
                alert('Enroll first!');
            }
        });
}
