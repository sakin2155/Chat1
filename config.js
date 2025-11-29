// Load environment variables from env-config.json (works on all hosting platforms)
async function loadEnvConfig() {
    try {
        console.log('🔄 Attempting to load env-config.json...');
        const response = await fetch('env-config.json');
        console.log('📥 env-config.json fetch response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Failed to fetch env-config.json:', response.status, response.statusText);
            return {};
        }
        
        const config = await response.json();
        console.log('📋 Config loaded successfully');
        console.log('✅ GEMINI_API_KEY loaded:', config.GEMINI_API_KEY ? config.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
        return config;
    } catch (error) {
        console.error('❌ Error loading env-config.json:', error);
        return {};
    }
}

// Export for use in other files
let ENV_CONFIG = {};
let configLoaded = false;

// Initialize config immediately
const configPromise = loadEnvConfig().then(config => {
    ENV_CONFIG = config;
    configLoaded = true;
    console.log('Environment config loaded:', Object.keys(ENV_CONFIG));
    return config;
});

// Function to wait for config to be loaded
async function waitForConfig() {
    if (!configLoaded) {
        await configPromise;
    }
    return ENV_CONFIG;
}
