import * as jwt from 'jsonwebtoken';

export default function DecodeToken(token){
    try{
        const secretKey = '@Jesus*Unico*Suficiente*Salvador@';
        
        const decoded = jwt.verify(token, secretKey);

        return decoded;
    }catch(e){
        return false
    }
};

