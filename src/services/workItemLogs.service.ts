import { getPrismaClient } from '../db/prisma.js';

export class WorkItemLogsService {
  private prisma = getPrismaClient();

  async findByWorkItem(workItemId: number, orgId: number) {
    const workItem = await this.prisma.workItem.findFirst({
      where: {
        id: workItemId,
        category: { orgId }
      }
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    return await this.prisma.workItemLog.findMany({
      where: { workItemId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
