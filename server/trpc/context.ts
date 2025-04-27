import type { H3Event } from 'h3';
import jwt from 'jsonwebtoken';

export const createTRPCContext = async (event: H3Event) => {
    const cookies = parseCookies(event);

    let userID = 0;
    let decondedJWT = null;
    if (cookies && cookies['tg-mini-game']) {
        const tmaCosmetics = cookies['tg-mini-game'] || null;
        if (tmaCosmetics) {
            const jwt_token = process.env.JWT_SECRET as string;
            decondedJWT = jwt.verify(tmaCosmetics, jwt_token) as any;
            userID = decondedJWT.id;
        }
    }

    return { 
        event: event,
        user: userID, 
        jwt: decondedJWT,
    };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
