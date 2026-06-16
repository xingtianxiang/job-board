import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "wb_uid";

/** 读取当前登录用户(含所属项目)。无 cookie 或用户不存在时返回 null。 */
export async function getCurrentUser() {
  const uid = cookies().get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({
    where: { id: uid },
    include: { project: true, presence: true },
  });
}
