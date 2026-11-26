//handles login functionality for login.html

import { supabase } from './supabaseClient.js';

const TITLES = { driver: "Driver Sign In", supervisor: "Supervisor Sign In" };
const TAB_NAMES = { driver: "Driver", supervisor: "Supervisor" };

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");
    const loginTitle = document.getElementById("loginTitle");
    const tabs = document.querySelectorAll(".role-tab");

    //which tab is selected: "driver" or "supervisor"
    let selectedRole = "driver";

    function selectRole(role) {
        selectedRole = role;
        loginTitle.textContent = TITLES[role];
        loginMessage.textContent = "";
        tabs.forEach(tab => {
            const isActive = tab.dataset.role === role;
            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-pressed", String(isActive));
        });
    }

    tabs.forEach(tab => tab.addEventListener("click", () => selectRole(tab.dataset.role)));

    const requested = new URLSearchParams(window.location.search).get("as");
    if (requested === "supervisor") selectRole("supervisor");

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        loginMessage.textContent = "";

        //get the user's email and password
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error("Login error:", error.message);
                if (error.code === "invalid_credentials") {
                    loginMessage.textContent = "Wrong email or password.";
                } else {
                    loginMessage.textContent = "Unable to sign in. Please try again.";
                }
                return;
            }

            const res = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${data.session.access_token}` }
            });
            const body = await res.json().catch(() => ({}));

            if (!res.ok) {
                await supabase.auth.signOut();
                loginMessage.textContent = body.error || "Couldn't check your account. Please try again.";
                return;
            }

            const actualRole = body.user.role;
            if (actualRole !== selectedRole) {
                await supabase.auth.signOut();
                loginMessage.textContent = `This is a ${actualRole} account. Use the ${TAB_NAMES[actualRole]} tab to sign in.`;
                return;
            }

            window.location.href = "../index.html";
        } catch (error) {
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
