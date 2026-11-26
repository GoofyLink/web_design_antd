import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: { code: number; data: LoginResult; message: string };
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', { username: data.username, password: data.password });
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  const response = await baseRequestClient.post<AuthApi.RefreshTokenResult>(
    '/auth/refresh',
    undefined,
    {
      withCredentials: true,
    },
  );
  const payload = response.data;
  if (payload.code !== 0 || !payload.data?.accessToken) {
    throw new Error(payload.message || '登录会话刷新失败');
  }
  return payload.data;
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', undefined, {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}
