
// IMPORTANT: Replace with your actual Firebase project configuration
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
const db = firebase.database(); // Using Realtime Database

const adminEmail = "akjhsrao@gmail.com";

// --- Authentication State Observer ---
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        console.log("User signed in:", user.email);
        checkUserRole(user);
    } else {
        // User is signed out.
        console.log("User signed out.");
        // If not on the login page, redirect to login
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});

// --- Google Sign-In ---
const loginButton = document.getElementById('loginButton');
if (loginButton) {
    loginButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                const user = result.user;
                console.log("Google Sign-In successful:", user);
                // The onAuthStateChanged observer will handle role checking and redirection
            })
            .catch((error) => {
                console.error("Google Sign-In Error:", error);
                const loginError = document.getElementById('loginError');
                if (loginError) {
                    loginError.textContent = `Error: ${error.message}`;
                }
            });
    });
}

// --- Check User Role and Redirect ---
function checkUserRole(user) {
    const userRef = db.ref('users/' + user.uid);
    userRef.once('value').then(snapshot => {
        let userData = snapshot.val();
        if (userData && userData.role) {
            // User role already exists
            redirectToDashboard(userData.role);
        } else {
            // New user or role not set
            let role = 'student'; // Default role
            if (user.email === adminEmail) {
                role = 'admin';
            }
            // Set user data in database
            userRef.set({
                email: user.email,
                uid: user.uid,
                role: role,
                displayName: user.displayName,
                photoURL: user.photoURL
            }).then(() => {
                redirectToDashboard(role);
            }).catch(error => console.error("Error setting user role:", error));
        }
    }).catch(error => console.error("Error fetching user data:", error));
}

function redirectToDashboard(role) {
    const currentPage = window.location.href;
    if (role === 'admin') {
        if (!currentPage.endsWith('admin.html')) {
            window.location.href = 'admin.html';
        }
    } else if (role === 'student') {
        if (!currentPage.endsWith('student.html')) {
            window.location.href = 'student.html';
        }
    } else {
        console.error("Unknown role:", role);
        if (!currentPage.endsWith('index.html')) {
            auth.signOut();
        }
    }
}

// --- Logout ---
const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                console.log('User signed out successfully');
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error('Sign out error:', error);
            });
    });
}

// Utility function to get current user (can be called from admin.js/student.js)
function getCurrentUser() {
    return auth.currentUser;
}
