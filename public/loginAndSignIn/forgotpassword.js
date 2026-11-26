import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded",() => {
    const forgotPassForm = document.getElementById("forgotPassForm");
    
    forgotPassForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        //we will ask the users for thier email and username to verify the password change
        const email = document.getElementById("retEmail").value.trim();
        const resetMessage = document.getElementById("resetMessage");
        
        try{
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

        }catch(error){
            console.error("Unexpected password request error:", error);

            resetMessage.textContent = "Something went wrong. Please try again.";
        }
                
    });

});