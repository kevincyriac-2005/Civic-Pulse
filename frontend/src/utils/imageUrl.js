import config from '../config';

const API_ORIGIN = config.API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return '';
    }

    if (imageUrl.startsWith('data:image') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    if (imageUrl.startsWith('/')) {
        return `${API_ORIGIN}${imageUrl}`;
    }

    return `${API_ORIGIN}/${imageUrl}`;
}
