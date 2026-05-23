-- Create bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Admins can upload logos for their tenant" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND tenant_id::text = (storage.foldername(name))[1]
  ))
);

CREATE POLICY "Admins can update logos for their tenant" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'logos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND tenant_id::text = (storage.foldername(name))[1]
  ))
);

CREATE POLICY "Admins can delete logos for their tenant" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'logos' AND 
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND tenant_id::text = (storage.foldername(name))[1]
  ))
);