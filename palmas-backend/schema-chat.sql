-- =============================================================================
--  Palmas.ps — محادثات الشات الحيّ
--
--  كانت المحادثات تُحفظ في متصفّح الزائر وحده، فلا تصل لوحة التحكم أبداً:
--  زائر يسأل ويترك رقمه، ولا يراه أحد. هذا يوصلها إلى CRM مثل باقي الطلبات.
--
--  التصميم إضافة فقط (append-only) عن قصد: الزائر يكتب ولا يقرأ ولا يعدّل.
--  معرّف المحادثة مبنيّ على الوقت وقابل للتخمين، فلو سُمح بالتعديل لأمكن
--  لأي أحد الكتابة فوق محادثة غيره. القراءة للأدمن وحده.
-- =============================================================================

create table if not exists public.chats (
  id          text        primary key,
  name        text        not null default '',
  phone       text        not null default '',
  lang        text        not null default 'ar',
  created_at  timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id          bigserial   primary key,
  chat_id     text        not null,
  role        text        not null default 'user'
                          check (role in ('user', 'bot')),
  body        text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_chat_idx on public.chat_messages (chat_id, id);

alter table public.chats         enable row level security;
alter table public.chat_messages enable row level security;

-- الزائر يبدأ محادثة ويرسل رسائل بلا حساب — هذا هو الغرض من الودجت.
drop policy if exists chats_insert_any on public.chats;
create policy chats_insert_any on public.chats
  for insert to anon, authenticated with check (true);

drop policy if exists chat_msgs_insert_any on public.chat_messages;
create policy chat_msgs_insert_any on public.chat_messages
  for insert to anon, authenticated with check (true);

-- القراءة للأدمن وحده: المحادثات تحمل أسماء وأرقام هواتف.
drop policy if exists chats_admin_read on public.chats;
create policy chats_admin_read on public.chats
  for select using (public.is_admin());

drop policy if exists chat_msgs_admin_read on public.chat_messages;
create policy chat_msgs_admin_read on public.chat_messages
  for select using (public.is_admin());

-- الحذف للأدمن وحده: تنظيف المحادثات المزعجة أو التجريبية من لوحة التحكم.
drop policy if exists chats_admin_delete on public.chats;
create policy chats_admin_delete on public.chats
  for delete using (public.is_admin());

drop policy if exists chat_msgs_admin_delete on public.chat_messages;
create policy chat_msgs_admin_delete on public.chat_messages
  for delete using (public.is_admin());

grant delete on public.chats         to authenticated;
grant delete on public.chat_messages to authenticated;

grant insert on public.chats         to anon, authenticated;
grant insert on public.chat_messages to anon, authenticated;
grant select on public.chats         to authenticated;
grant select on public.chat_messages to authenticated;
grant usage, select on sequence public.chat_messages_id_seq to anon, authenticated;
