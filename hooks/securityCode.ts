export default function generateSecurityCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@';
    let code = '';
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }
    return code;
}
