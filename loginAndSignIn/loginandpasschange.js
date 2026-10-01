/*
Author: Alex Benny
Team: "Hello World"
Description: This file compares the username and password with the data and redirects the user to main page for login page. 
    This file also helps the user reset their password.
*/


document.addEventListener("DOMContentLoaded",() => {
    //This is part until the next comment is used for sigining into the website (login.html)
    const loginForm = document.getElementById("loginForm");
    if(loginForm){
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            
            //For the text boxes for username and password
            const user = document.getElementById("username").value;
            const pass = document.getElementById("password").value;

            //this should be changed so it compared the username and matching passwords that are stored on the database
            //we should this check, but we need to hide this so random people cannot anlyze the code or trace the variable
            if(user === "admin" && pass === "1234"){
                //change this to the correct html file if this is the wrong file
                window.location.href = "index.html";
            }
            else{
                alert("Incorrect username or password");
            }
    
        });

        //this code checks if the user presses forgot password and redircts them to forgotpasspage.html
        const forgotPassBtn = document.getElementById("forgotPassBtn");
        if (forgotPassBtn) {
            forgotPassBtn.addEventListener("click", () => {
                window.location.href = "forgotpasspage.html";
            });
        }
    }

    //This bottom half is linked the the html file that changes passwords for the user (forgotpasspage.html) 

    const forgotPassForm = document.getElementById("forgotPassForm");
    if (forgotPassForm){
        forgotPassForm.addEventListener("submit", (event) => {
            event.preventDefault();

            //we will ask the users for thier email and username to verify the password change
            //this might change in the future
            const email = document.getElementById("email").value;
            const user = document.getElementById("username").value;
            const pass = document.getElementById("password").value;

            //checks the new password's length
            if(pass.length < 8 || pass.length > 16){
                alert("Your password must be between 8 to 16 characters");
                return;
            }
            
            //encrypt and store the new password onto the server

            window.location.href = "login.html";
        });
    } 
});




