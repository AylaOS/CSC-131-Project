/*
Team: "Hello World"
Description: This file compares the username and password with the data and redirects the user to main page for login page. 
    This file also helps the user reset their password by sending an email from supabase and sends them to reset password page.
*/

import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded",() => {
    //This is part until the next comment is used for sigining into the website (login.html)
    const loginForm = document.getElementById("loginForm");
    if(loginForm){
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            //For the text boxes for username and password
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            //authenticates the username an password with the information on the server
            const {data, error} = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if(error){
                alert("Incorrect username or password");
                console.error("Login error:", error.message);
                return;
            }
            console.log("Authenticated user: ", data.user);
            window.location.href = "../index.html";
        });

        //this code checks if the user presses forgot password and redircts them to forgotpasspage.html
        const forgotPassBtn = document.getElementById("forgotPassBtn");
        if (forgotPassBtn) {
            forgotPassBtn.addEventListener("click", () => {
                window.location.href = "forgotpasspage.html";
            });
        }
    }

    //This part is linked the the html file that changes passwords for the user (forgotpasspage.html) 
    const forgotPassForm = document.getElementById("forgotPassForm");
    if (forgotPassForm){
        forgotPassForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            //we will ask the users for thier email and username to verify the password change
            const email = document.getElementById("retEmail").value;
            const resetMessage = document.getElementById("resetMessage");
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {redirectTo: new URL(
                "resetpassword.html", 
                window.location.href).href
            });

            if (error) {
                console.error("Password request failed:", error.message);
                resetMessage.textContent = 
                    "Unable to process the request. Please try again.";
                return;
            }

            resetMessage.textContent = "If an accound exits for this email, you may recieve a password-reset link.";        
        });
    }
    
    //this part is linked to resetpassword.html
    const resetPassword = document.getElementById("resetPassword");
    if(resetPassword){
        const newPassword = document.getElementById("newPassword");
        const confirmPassword = document.getElementById("confirmPassword");
            

        const lengthReq = document.getElementById("length");
        const uppercaseReq = document.getElementById("uppercase");
        const lowercaseReq = document.getElementById("lowercase");
        const numberReq = document.getElementById("number"); 
        const specialReq = document.getElementById("special");
        const matchReq = document.getElementById("password_match");
        
        function checkPasswordRequirements(){
            const lengthValid = newPassword.value.length >= 12;
            const uppercaseValid = /[A-Z]/.test(newPassword.value);
            const lowercaseValid = /[a-z]/.test(newPassword.value);
            const numberValid = /[0-9]/.test(newPassword.value);
            const specialCharValid = /[^A-Za-z0-9]/.test(newPassword.value);
            const matchValid = confirmPassword.value.length > 0 && newPassword.value === confirmPassword.value;
            
            lengthReq.classList.toggle("valid",lengthValid);
            uppercaseReq.classList.toggle("valid", uppercaseValid);
            lowercaseReq.classList.toggle("valid",lowercaseValid);
            numberReq.classList.toggle("valid", numberValid);
            specialReq.classList.toggle("valid", specialCharValid);
            matchReq.classList.toggle("valid", matchValid);

            return (lengthValid && uppercaseValid && lowercaseValid && numberValid && specialCharValid && matchReq);
        }

        newPassword.addEventListener("input", checkPasswordRequirements);
        confirmPassword.addEventListener("input", checkPasswordRequirements);

        //write the part that sends the password into the database
        resetPassword.addEventListener("submit", async (event) => {
            event.preventDefault();

            if(!checkPasswordRequirements()){
                alert("Please meet all password requirements.");
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: newPassword.value
            });

            if (error) {
                console.error("Password update failed:", error.message);

                alert("Unable to update your password. Please try again.");
                return;
            }

            alert("Your password has been updated successfully!");

            window.location.href="login.html";


        })
    }


});
        


