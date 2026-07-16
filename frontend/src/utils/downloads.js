import api from '../api/axios';
import toast from 'react-hot-toast';

export async function downloadApiFile(url, fallbackName) {
  try {
    const response = await api.get(url, { responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || fallbackName;
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    toast.error(error.response?.data?.error || 'No se pudo descargar el documento');
    throw error;
  }
}
