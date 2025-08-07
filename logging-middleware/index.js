export async function log(stack, level, packageName, message) {
    const logPayload = {
        stack,
        level,
        package: packageName,
        message,
    };

    const LOGGGING_URL = 'http://20.244.56.144/evaluation-service/logs';

    try {
        const response = await fetch(LOGGGING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logPayload)
        });
        if (!response.ok) {
            console.log('Failed to send log:');
        }
        const data=await response.json();
        console.log(`response of logging: ${data.logID}, ${data.message}`)
        return { data }
    } catch (error) {
        console.error('Error sending log:', error);
    }
}