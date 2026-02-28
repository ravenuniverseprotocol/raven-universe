function initSettings() {
    const settingsBtn = document.querySelector('[title="Settings"]');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            console.log("Settings Module: Logic not implemented yet.");
            alert("Station settings locked. Admin credentials required.");
        };
    }
}
