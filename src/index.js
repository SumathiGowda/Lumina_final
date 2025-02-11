const express = require("express");
const path = require("path");
const mysql2 = require("mysql2");
const bcryptjs = require("bcryptjs");
const session = require("express-session");
const multer = require("multer");
const cors = require("cors");
const router = express.Router();
const fileUpload = require('express-fileupload');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.set('view engine', 'ejs');
app.use(fileUpload());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
// Make sure bodyParser middleware is included before your route logic

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());





app.use(
  session({
    secret: 'Sg@18114517',  // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // If using HTTPS, set secure: true
  })
);

// Database connection
const db = mysql2.createConnection({
  host: "localhost",
  user: "root",
  password: "2004",
  database: "lumina",
});

db.connect((err) => {
  if (err) {
    console.log("Connection failed: ", err);
    return;
  }
  console.log("Database connected");
});


app.get('/review-post', (req, res) => {
  // Fetch posts from the database
  db.query('SELECT * FROM posts', (err, results) => {
    if (err) {
      console.error('Error fetching posts:', err);
      return res.status(500).send('Server error');
    }

    // Pass the posts to the EJS view
    res.render('review-post', { posts: results });
    
  });
});



//routes
app.get('/', (req, res)=>{
  res.render('lumina')
})


app.get('/SignIn', (req, res)=>{
    res.render('signin')
})
app.get('/message', (req, res)=>{
  res.render('message')
})

app.get('/SignUp', (req, res)=>{
    res.render('signup')
})

app.get('/AboutLumina', (req, res)=>{
  res.render('aboutLumina')
})

app.get('/BecomeMember', (req, res)=>{
  res.render('becomeMember')
})

app.get('/JoinNow', (req, res)=>{
  res.render('joinNow')
})



app.get('/NewPost', (req, res)=>{
  res.render('newPost')
})

app.get('/AdminNotification', (req, res)=>{
  res.render('adminNotification')
})

app.get('/admin1', (req, res)=>{
  res.render('admin1')
})

app.get('/noti', (req, res)=>{
  res.render('noti')
})

app.get('/editpfp',(req, res)=>{
  res.render('editpfp')
})

app.get('/ResetPassword',(req, res)=>{
  res.render('ResetPassword')
});


app.get('/forgotpassword', (req, res) => {
  res.render('ForgotPassword') // Serve Forgot Password page
});

app.post('/forgot-password', (req, res) => {
  const { userId } = req.body;

  // Check if the user exists in the signup table
  const userQuery = 'SELECT * FROM signup WHERE username = ?';
  db.query(userQuery, [userId.trim()], (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Server Error');
      }

      if (results.length === 0) {
          return res.send('User does not exist.');
      }

      // If the user exists, allow them to reset the password
      res.send('User exists. Redirecting to reset password page...');
  });
});


// Reset Password Route
app.post('/reset-password', (req, res) => {
  const { userId, newPassword } = req.body;

  // Hash the new password
  bcryptjs.hash(newPassword, 10, (err, hash) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Server Error');
      }

      // Update the user's password in the signup table
      const updateQuery = 'UPDATE signup SET password = ? WHERE username = ?';
      db.query(updateQuery, [hash, userId], (err) => {
          if (err) {
              console.error(err);
              return res.status(500).send('Server Error');
          }

          res.send('Password has been reset successfully.');
      });
  });
});


app.get('/viewer_profile/:username', (req, res) => {
  const { username } = req.params;

  // Query the database for the user's profile
  const profileQuery = `
    SELECT name, username, email, contact, semester, college, branch, created_at, bio, gender, dob, profile_img
    FROM signup
    WHERE username = ?
  `;

  // Query the database for the user's posts
  const postsQuery = `
    SELECT post_id, content, image_path, video_path, created_at
    FROM posts
    WHERE username = ? AND status = 'accepted'
    ORDER BY created_at DESC
  `;

  // Execute the profile query
  db.query(profileQuery, [username], (profileErr, profileResults) => {
    if (profileErr) {
      console.error("Error fetching user profile:", profileErr);
      return res.status(500).send("Server error fetching profile"); // More specific error message
    }

    if (profileResults.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = profileResults[0]; // Get the user object from the results

    // Execute the posts query *after* the profile query is complete
    db.query(postsQuery, [username], (postsErr, postsResults) => {
      if (postsErr) {
        console.error("Error fetching user posts:", postsErr);
        return res.status(500).send("Server error fetching posts"); // More specific error message
      }

      // Render the profile page with user data and posts
      res.render('viewer_profile', { user: user, posts: postsResults }); //Pass 'user' object
      
    });
  });
});





// Define the directory to store uploaded images
const imageDir = path.join(__dirname, 'uploads/profile_images'); // Updated directory name

// API Endpoint to Update Profile
app.post('/updateProfile', (req, res) => {
    const {
        username,
        fullName,
        bio,
        gender,
        dob
    } = req.body; // other fields

    console.log("Request body:", req.body);

    // Ensure username is provided
    if (!username) {
        return res.status(400).json({
            error: 'Username is required.'
        });
    }

    let profileImage = null; // Initialize profileImage to null

    // Handle file upload
    if (req.files && req.files.profileImage) {
        const profileImageFile = req.files.profileImage;
        const imageExtension = path.extname(profileImageFile.name);
        profileImage = `/uploads/profile_images/${username}_${Date.now()}${imageExtension}`; // File path to save

        // Ensure the upload directory exists
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, {
                recursive: true
            });
        }

        profileImageFile.mv(path.join(__dirname, profileImage), (err) => {
            if (err) {
                console.error("Error saving profile image:", err);
                return res.status(500).json({
                    error: 'Failed to upload profile image'
                });
            }
            console.log("Uploaded Profile Image:", profileImageFile.name);
            console.log("Uploaded Profile Image Path:", profileImage);

            // SQL query to update the user's profile, including the profile_img
            const sql = `
                UPDATE signup
                SET
                    name = ?,
                    bio = ?,
                    gender = ?,
                    dob = ?,
                    profile_img = ?
                WHERE username = ?
            `;

            db.query(sql, [fullName, bio, gender, dob, profileImage, username], (err, result) => {
                if (err) {
                    console.error('Error updating profile: ' + err.stack);
                    return res.status(500).json({
                        error: 'Failed to update profile'
                    });
                }

                if (result.affectedRows === 0) {
                    // No rows were updated, meaning the username might not exist
                    return res.status(404).json({
                        error: 'User not found with username: ' + username
                    });
                }

                console.log('Profile updated successfully');
  
                res.json({
                    message: 'Profile updated successfully'
                });
            });
        });
    } else {
        // No image was uploaded, update other fields
        const sql = `
            UPDATE signup
            SET
                name = ?,
                bio = ?,
                gender = ?,
                dob = ?
            WHERE username = ?
        `;

        db.query(sql, [fullName, bio, gender, dob, username], (err, result) => {
            if (err) {
                console.error('Error updating profile: ' + err.stack);
                return res.status(500).json({
                    error: 'Failed to update profile'
                });
            }

            if (result.affectedRows === 0) {
                // No rows were updated, meaning the username might not exist
                return res.status(404).json({
                    error: 'User not found with username: ' + username
                });
            }

            console.log('Profile updated successfully (without image)');
           
            res.json({
                message: 'Profile updated successfully'
            });
        });
    }
});

app.get('/pfp', (req, res) => {
  if (!req.session || !req.session.userId) {
    console.log("User not logged in");
    return res.status(401).send("User not logged in");
  }

  const userQuery = 'SELECT name, username FROM signup WHERE username = ?';
  db.query(userQuery, [req.session.userId], (err, userResults) => {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).send("Server Error");
    }

    if (userResults.length === 0) {
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    const user = userResults[0];

    const postQuery = `
      SELECT s.name, p.username, p.content, p.image_path, p.video_path, p.created_at
FROM posts p
JOIN signup s ON p.username = s.username
WHERE p.username = ? AND p.status = 'accepted'
ORDER BY p.created_at DESC;

    `;

    db.query(postQuery, [user.username], (err, postResults) => {
      if (err) {
        console.error("Database error: ", err);
        return res.status(500).send("Server Error");
      }

      res.render('pfp', { user, posts: postResults });
      
    });
  });
});


app.get('/home', (req, res) => {
  const postQuery = `
      SELECT s.name, p.username, p.content, p.image_path, p.video_path, p.created_at
      FROM posts p
      JOIN signup s ON p.username = s.username
      WHERE p.status = 'accepted'
      ORDER BY p.created_at DESC;
  `;

  db.query(postQuery, (err, postResults) => {
    if (err) {
      console.error("Database error: ", err);
      return res.status(500).send("Server Error");
    }

    res.render('home', { posts: postResults });  // Remove 'user' object
  });
});


app.get('/search-users', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Username is required for search." });
  }

  // Query the database for matching usernames
  const query = `
    SELECT name, username, college, profile_img 
    FROM signup 
    WHERE username LIKE ? 
    LIMIT 10
  `;
  const searchTerm = `%${username}%`; // Allow partial matches

  db.query(query, [searchTerm], (err, results) => {
    if (err) {
      console.error("Error searching for users:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ users: results });
  });
});



app.post('/admin/post-notification', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Message is required" });
  }


  // Step 1: Get all users from the signup table
  db.query('SELECT username FROM signup', (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    // Step 2: Prepare notifications for each user
    const insertQuery = 'INSERT INTO notifications (username, message) VALUES ?';
    const values = users.map(user => [user.username, message]); // Create an array of [username, message] pairs

    // Step 3: Insert notifications in bulk
    db.query(insertQuery, [values], (err, result) => {
      if (err) {
        console.error('Error inserting notifications:', err);
        return res.status(500).json({ success: false, error: "Database error" });
      }

      res.json({ success: true });
    });
  });
});

// Route to fetch user profile by username
app.get('/profile/:username', (req, res) => {
  const { username } = req.params;

  // Query the database for the user's profile
  const profileQuery = `
    SELECT name, username, email, contact, semester, college, branch, created_at 
    FROM signup 
    WHERE username = ?
  `;

  // Query the database for the user's posts
  const postsQuery = `
    SELECT post_id, content, image_path, video_path, created_at 
    FROM posts 
    WHERE username = ? AND status = 'accepted'
    ORDER BY created_at DESC
  `;

  db.query(profileQuery, [username], (err, profileResults) => {
    if (err) {
      console.error("Error fetching user profile:", err);
      return res.status(500).send("Server error");
    }

    if (profileResults.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = profileResults[0];

    // Fetch the user's posts
    db.query(postsQuery, [username], (err, postsResults) => {
      if (err) {
        console.error("Error fetching user posts:", err);
        return res.status(500).send("Server error");
      }

      // Render the profile page with user data and posts
      res.render('profile', { user, posts: postsResults });
    });
  });
});



// Admin credentials (hardcoded)
const adminCredentials = {
  userId: 'admin123',
  password: 'adminpass'
};

app.post('/SignIn', (req, res) => {
  const { role, userId, password } = req.body;

  // Trim whitespace from user input
  const trimmedUserId = userId.trim();
  const trimmedPassword = password.trim();

  // Admin credentials check
  if (role === 'admin') {
    if (trimmedUserId === adminCredentials.userId && trimmedPassword === adminCredentials.password) {
      // Admin login successful
      return res.send("Login successful!");  // You can redirect here as needed
    } else {
      return res.send('Invalid admin credentials.');
    }
  }
  
  // User credentials check (for regular users)
  else if (role === 'user')
     {
    const userQuery = 'SELECT * FROM signup WHERE username = ?';
    db.query(userQuery, [trimmedUserId], (err, results) => {
      if (err) {
        console.error(err);
        return res.send('Server Error');
      }

      if (results.length === 0) {
        return res.send('User does not have an account.');
      }

      const user = results[0]; // Assuming the first result is the user

      // Compare the entered password with the stored hashed password
      bcryptjs.compare(trimmedPassword, user.password, (err, isMatch) => {
        if (err) {
          console.error(err);
          return res.send('Server Error');
        }

        if (!isMatch) {
          return res.send('Invalid password.');
        }
        req.session.userId = user.username;  // Set session with the username of the logged-in user
        return res.send("Login successful!");
        
      });
    });
  } 
  else {
    return res.send('Invalid role selected.');
  }
});

app.get('/check-session', (req, res) => {
  if (req.session.userId) {
    res.send(`Session active for user: ${req.session.userId}`);
  } else {
    res.send('No active session');
  }
});



app.post('/signup', async (req, res) => {
  const { name, username, email, contact, password, semester, college, branch } = req.body;

  if (!name || !username || !email || !contact || !password || !semester || !college || !branch) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Check if username or email already exists
  const checkQuery = `
    SELECT * FROM signup WHERE username = ? OR email = ?
  `;

  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Error checking for existing user.' });
    }

    // If username or email already exists
    if (results.length > 0) {
      if (results.some(user => user.username === username)) {
        return res.status(400).json({ message: 'Username already exists!' });
      }
      if (results.some(user => user.email === email)) {
        return res.status(400).json({ message: 'Email already exists!' });
      }
    }

    // Hash password and insert user into database
    try {
      const hashedPassword = await bcryptjs.hash(password, 10);

      const query = `
        INSERT INTO signup (name, username, email, contact, password, semester, college, branch)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(query, [name, username, email, contact, hashedPassword, semester, college, branch], (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: 'Error registering user.' });
        }
        
        // Set session with the username after registration
        req.session.userId = username;

        // Respond with success message
        res.status(201).json({ message: 'User registered successfully!' });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error.' });
    }
  });
});



app.get('/getUser', (req, res) => {
  if (req.session && req.session.userId) {
    const userQuery = 'SELECT name, username, bio, gender, dob, profile_img FROM signup WHERE username = ?';
    db.query(userQuery, [req.session.userId], (err, results) => {
      if (err) {
        console.error("Database error: ", err);
        return res.status(500).send('Server Error');
      }

      if (results.length === 0) {
        console.log("User not found");
        return res.status(404).send('User not found');
      }

      const user = results[0];
      console.log("User data fetched:", user);
      return res.json({
        name: user.name,
        username: user.username,
        bio: user.bio,
        gender: user.gender,
        dob: user.dob,
        profile_img: user.profile_img
      });
    });
  } else {
    console.log("User not logged in");
    return res.status(401).json({ message: 'User not logged in' });
  }
});

app.post('/NewPost', async (req, res) => {
  try {
    // Ensure required fields exist
    const { username, postContent } = req.body;

    if (!username || !postContent.trim()) {
      return res.status(400).send('Missing username or post content');
    }

    console.log("Username:", username);
    console.log("Post Content:", postContent);

    // Define upload directories
    const imageDir = path.join(__dirname, 'uploads/images');
    const videoDir = path.join(__dirname, 'uploads/videos');

    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    let imagePath = null;
    let videoPath = null;

    // Handle file uploads
    if (req.files) {
      if (req.files.sampleFile) {
        let sampleFile = req.files.sampleFile;
        imagePath = `/uploads/images/${Date.now()}_${sampleFile.name}`;
        await sampleFile.mv(path.join(__dirname, imagePath));
        console.log("Uploaded Image:", sampleFile.name);
        console.log("Uploaded Image Path:", imagePath); 
      }

      if (req.files.sampleVideo) {
        let sampleVideo = req.files.sampleVideo;
        videoPath = `/uploads/videos/${Date.now()}_${sampleVideo.name}`;
        await sampleVideo.mv(path.join(__dirname, videoPath));
        console.log("Uploaded Video:", sampleVideo.name);
        console.log("Uploaded Video Path:", videoPath);
      }
    }

    // Insert post data into MySQL
    const query = `
    INSERT INTO posts (username, content, image_path, video_path, status) 
    VALUES (?, ?, ?, ?, 'pending')
  `;
  
  try {
    db.query(query, [username, postContent, imagePath, videoPath], (err, result) => {
      if (err) {
        console.error("Error saving post:", err);
        return res.status(500).send(  `Database error occurred: ${err.message}  `);
      }
      return res.redirect('/message');
      // if (result.affectedRows > 0) {
      //   res.send({ message: "Post successfully saved!", post_id: result.insertId });
        
      // } else {
      //   res.status(500).send("Failed to insert post.");
      // }
    });
  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).send(`Database error occurred: ${error.message}`);
  }
  
  

  } catch (error) {
    console.error("Error saving post:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Update Post Status API
app.post('/update-post-status', (req, res) => {
  const { postId, status, username } = req.body;

  // Validate status
  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  // Update post status in the database
  const updatePostQuery = 'UPDATE posts SET status = ? WHERE post_id = ?';
  db.query(updatePostQuery, [status, postId], (err, result) => {
    if (err) {
      console.error('Error updating post status:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (status === 'accepted') {
      const notificationMessage = 'Your post has been approved and posted successfully.';
      if (!username) {
        console.error('Username is null or undefined');
        return res.status(400).json({ error: 'Username is required' });
      }
      console.log('Username:', username);
      const insertNotificationQuery = 'INSERT INTO notifications (username, message) VALUES (?, ?)';
      db.query(insertNotificationQuery, [username, notificationMessage], (err, result) => {
        if (err) {
          console.error('Error inserting notification:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      });
    }

    if (status === 'rejected') {
      const notificationMessage = 'Sorry Better Luck next time';
      if (!username) {
        console.error('Username is null or undefined');
        return res.status(400).json({ error: 'Username is required' });
      }
      console.log('Username:', username);
      const insertNotificationQuery = 'INSERT INTO notifications (username, message) VALUES (?, ?)';
      db.query(insertNotificationQuery, [username, notificationMessage], (err, result) => {
        if (err) {
          console.error('Error inserting notification:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      });
    }

    res.json({ message: `Post status updated to ${status}` });
  });
});


app.get('/get-pending-posts', (req, res) => {
  const query = 'SELECT * FROM posts WHERE status = ?';
  db.query(query, ['pending'], (err, results) => {
    if (err) {
      console.error('Error fetching pending posts:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(results);
  });
});

app.get('/get-notifications', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'User not logged in' });
  }

  const username = req.session.userId;
  const query = 'SELECT * FROM notifications WHERE username = ? ORDER BY created_at DESC';
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Error fetching notifications:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ notifications: results });
  });
});

app.post('/mark-notification-as-read', (req, res) => {
  const { notificationId } = req.body;

  const query = 'UPDATE notifications SET is_read = TRUE WHERE id = ?';
  db.query(query, [notificationId], (err, result) => {
    if (err) {
      console.error('Error marking notification as read:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  });
});

app.post('/admin/post-notification', (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: "Message is required" });
  }


  // Step 1: Get all users from the signup table
  db.query('SELECT username FROM signup', (err, users) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    // Step 2: Prepare notifications for each user
    const insertQuery = 'INSERT INTO notifications (username, message) VALUES ?';
    const values = users.map(user => [user.username, message]); // Create an array of [username, message] pairs

    // Step 3: Insert notifications in bulk
    db.query(insertQuery, [values], (err, result) => {
      if (err) {
        console.error('Error inserting notifications:', err);
        return res.status(500).json({ success: false, error: "Database error" });
      }

      res.json({ success: true });
    });
  });
});

// Port Connection
app.listen(port, ()=>{
    console.log(`port connected: ${port}`)
})

