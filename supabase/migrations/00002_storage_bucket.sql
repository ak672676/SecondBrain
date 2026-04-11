-- Create private storage bucket for document uploads
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false);
