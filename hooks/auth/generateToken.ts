import * as jwt from 'jsonwebtoken';


export default function GenerateToken(payload:any){
    const secretKey = '@Jesus*Unico*Suficiente*Salvador@';
    
    const token = jwt.sign(payload, secretKey, {
        expiresIn: '6h', 
    });

    return token;
};

