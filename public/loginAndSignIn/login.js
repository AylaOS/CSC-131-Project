
//handles login functionality  for login.html
import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded",() => {

    const loginForm = document.getElementById("loginForm");
    
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        //used for the login message that pops up underneath the login button
        const loginMessage = document.getElementById("loginMessage");
        loginMessage.textContent = "";

        //retrieve the user's email and password
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try{
            const {data, error} = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
        
        //authenticates the user using Supabase.

            if(error){
                console.error("Login error:", error.message);
                
                if (error.code === "invalid_credentials"){
                    loginMessage.textContent = "Wrong email or password.";
                }
                else{
                    loginMessage.textContent = "Unable to sign in. Please try again";
                }
                
                return;
            }
            console.log("Authenticated user: ", data.user);
            window.location.href = "../index.html";
        } catch(error){
            console.error("Unexpected login error:", error);
            loginMessage.textContent = "Something went wrong. Please try again.";
        }
    });

    const forgotPassBtn = document.getElementById("forgotPassBtn");
    if (forgotPassBtn) {
        forgotPassBtn.addEventListener("click", () => {
            window.location.href = "forgotpassword.html";
        });
    }
});