// Load environment variables from .env file
async function loadEnvConfig() {
    try {
        const response = await fetch('.env');
        const text = await response.text();
        const lines = text.split('\n');
        const config = {};
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, value] = trimmed.split('=');
                if (key && value) {
                    config[key.trim()] = value.trim();
                }
            }
        });
        
        return config;
    } catch (error) {
        console.error('Error loading .env file:', error);
        return {};
    }
}

// Export for use in other files
let ENV_CONFIG = {};

// Initialize config on page load
loadEnvConfig().then(config => {
    ENV_CONFIG = config;
    console.log('Environment config loaded');
});
