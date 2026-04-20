import request from './http'

/**
 * 文件上传
 * @param file 要上传的文件对象 (Blob 或 File)
 * @returns 成功返回文件的 OSS URL 字符串
 */
export async function uploadFile(file: Blob | File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await request.post<{ code: number; message: string; data: string }>('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data.data
}