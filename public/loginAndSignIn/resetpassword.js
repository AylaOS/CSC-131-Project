import { supabase } from './supabaseClient.js';

document.addEventListener("DOMContentLoaded",() => {
    const resetPassword = document.getElementById("resetPassword");
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

        return (lengthValid && uppercaseValid && lowercaseValid && numberValid && specialCharValid && matchValid);
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

        try {
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
        } catch (error) {
            console.error("Unexpected password update error:", error);
            alert("Something went wrong. Please try again");
        }

    })
    
});