'use server';

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { emailConfigured, sendEmail, siteUrl } from '@/lib/email';
import { str, withParam } from '@/lib/util';

const ONE_HOUR = 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export async function requestPasswordReset(formData) {
  const who = str(formData, 'who', 200).toLowerCase();
  if (!who) redirect(withParam('/forgot', 'error', 'Enter your email or username.'));
  if (!emailConfigured()) {
    redirect(withParam('/forgot', 'error', "Password reset emails aren't set up on this site yet. Please contact the site owner."));
  }

  const user = await prisma.user.findFirst({ where: { OR: [{ email: who }, { username: who }] } });

  // Always show the same message, so nobody can use this page to check who has an account.
  if (user) {
    const recent = await prisma.passwordReset.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - ONE_HOUR) } },
    });
    if (recent < 3) {
      const token = crypto.randomBytes(32).toString('base64url');
      await prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ONE_HOUR) },
      });

      const link = `${siteUrl()}/reset?token=${token}`;
      const name = escapeHtml(user.displayName);
      try {
        await sendEmail({
          to: user.email,
          subject: 'Reset your BFRENZ password',
          text:
            `Hi ${user.displayName},\n\nSomeone asked to reset the password for your BFRENZ account (@${user.username}).\n\n` +
            `Reset it here (link works for 1 hour, one time only):\n${link}\n\n` +
            `If this wasn't you, just ignore this email. Your password won't change.\n\n- BFRENZ.com`,
          html:
            `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0b0b0c;color:#f2f2f3;padding:28px;border-radius:14px">` +
            `<div style="font-size:26px;font-weight:bold;color:#fff">bfrenz<span style="color:#ff7a1a">.com</span></div>` +
            `<p>Hi ${name},</p><p>Someone asked to reset the password for your BFRENZ account (@${escapeHtml(user.username)}).</p>` +
            `<p style="text-align:center;margin:28px 0"><a href="${link}" style="background:#ff7a1a;color:#0b0b0c;padding:12px 24px;border-radius:999px;font-weight:bold;text-decoration:none">Reset my password</a></p>` +
            `<p style="color:#a4a4ab;font-size:13px">This link works once and expires in 1 hour. If this wasn't you, ignore this email and your password won't change.</p></div>`,
        });
      } catch (err) {
        console.error('[password reset] email failed:', err);
        redirect(withParam('/forgot', 'error', "We couldn't send the email right now. Please try again in a few minutes."));
      }
    }
  }
  redirect('/forgot?sent=1');
}

export async function resetPassword(formData) {
  const token = String(formData.get('token') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  const back = `/reset?token=${encodeURIComponent(token)}`;

  if (password.length < 8) redirect(withParam(back, 'error', 'Passwords need at least 8 characters.'));
  if (password !== confirm) redirect(withParam(back, 'error', "Those passwords don't match."));

  const reset = token
    ? await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } })
    : null;
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    redirect(withParam('/forgot', 'error', 'That reset link is expired or was already used. Request a new one.'));
  }

  const newVersion = (reset.user.sessionVersion ?? 0) + 1;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await bcrypt.hash(password, 10), sessionVersion: newVersion },
    }),
    prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    prisma.passwordReset.deleteMany({ where: { userId: reset.userId, usedAt: null } }),
  ]);

  await createSession(reset.userId, newVersion);
  redirect('/home?reset=1');
}
