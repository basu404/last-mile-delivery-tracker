import type { OrderStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import { env, prisma } from '../../config/env';

interface Recipient {
  id: string;
  email: string;
}

interface NotifiableOrder {
  id: string;
  customer: Recipient;
}

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  created: 'has been created',
  assigned: 'has been assigned to a delivery agent',
  picked_up: 'has been picked up',
  in_transit: 'is in transit',
  out_for_delivery: 'is out for delivery',
  delivered: 'has been delivered',
  failed: 'could not be delivered. Please reschedule your delivery',
  rescheduled: 'has been rescheduled',
  cancelled: 'has been cancelled',
};

const smtpConfigured = Boolean(
  env.SMTP_HOST &&
    env.SMTP_PORT &&
    env.SMTP_USER &&
    env.SMTP_PASS &&
    env.EMAIL_FROM &&
    !env.SMTP_USER.includes('your_email') &&
    !env.SMTP_PASS.includes('your_app_password'),
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    })
  : null;

async function deliverAndLog(
  orderId: string,
  recipient: Recipient,
  message: string,
): Promise<void> {
  let status = 'failed';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: recipient.email,
        subject: `Order ${orderId} update`,
        text: message,
      });
      status = 'sent';
    } catch (error) {
      console.error('Email delivery failed:', error instanceof Error ? error.message : error);
    }
  }

  try {
    await prisma.notification.create({
      data: {
        orderId,
        recipientId: recipient.id,
        channel: 'email',
        message,
        status,
      },
    });
  } catch (error) {
    console.error('Notification logging failed:', error instanceof Error ? error.message : error);
  }
}

export async function sendOrderNotification(
  order: NotifiableOrder,
  status: OrderStatus,
): Promise<void> {
  const message = `Your order #${order.id} ${STATUS_MESSAGES[status]}.`;
  await deliverAndLog(order.id, order.customer, message);
}

export async function sendAssignmentNotifications(
  order: NotifiableOrder,
  agent: Recipient,
): Promise<void> {
  await Promise.all([
    sendOrderNotification(order, 'assigned'),
    deliverAndLog(order.id, agent, `Order #${order.id} has been assigned to you.`),
  ]);
}
