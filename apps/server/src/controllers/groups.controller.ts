import type { Request, Response, NextFunction } from 'express';
import { getGroupById } from '../services/groups.service.js';

export const getGroup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const group = await getGroupById(Number(req.params.id));
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json(group);
  } catch (error) {
    next(error);
  }
};