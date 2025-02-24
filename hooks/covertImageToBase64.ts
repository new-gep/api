import * as fs from 'fs';
export default function ConvertImageToBase64(filePath: any) {
    try {
        const picture = fs.readFileSync(filePath)
        const  base64Image = picture.toString('base64');
        return base64Image;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
};
