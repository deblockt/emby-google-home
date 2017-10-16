CREATE TABLE public.users (
	id uuid NOT NULL,
	username text NOT NULL,
	password text NOT NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_un UNIQUE (username)
)
WITH (
	OIDS=FALSE
) ;
CREATE INDEX users_username_password ON public.users (username DESC,password DESC) ;

CREATE TABLE public.server_info (
	uri text NOT NULL,
	emby_user text NOT NULL,
	emby_user_password text NULL,
	user_id uuid NOT NULL,
	CONSTRAINT server_info_pk PRIMARY KEY (user_id),
	CONSTRAINT server_info_un UNIQUE (user_id),
	CONSTRAINT server_info_users_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
)
WITH (
	OIDS=FALSE
) ;

CREATE TABLE public.oauth_tokens (
	id uuid NOT NULL,
	access_token text NOT NULL,
	access_token_expires_on timestamp NOT NULL,
	client_id text NOT NULL,
	refresh_token text NOT NULL,
	refresh_token_expires_on timestamp NOT NULL,
	user_id uuid NOT NULL,
	CONSTRAINT oauth_tokens_pkey PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;

CREATE TABLE public.oauth_clients (
	client_id text NOT NULL,
	client_secret text NOT NULL,
	redirect_uri text NOT NULL,
	CONSTRAINT oauth_clients_pkey PRIMARY KEY (client_id,client_secret)
)
WITH (
	OIDS=FALSE
) ;

CREATE TABLE public.authorization_codes (
	id uuid NOT NULL,
	authorization_code text NOT NULL,
	expires_at timestamp NOT NULL,
	redirecturi text NOT NULL,
	client_id text NOT NULL,
	user_id uuid NOT NULL,
	CONSTRAINT authorization_code PRIMARY KEY (id)
)
WITH (
	OIDS=FALSE
) ;
