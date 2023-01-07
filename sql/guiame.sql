CREATE DATABASE guiame
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1
    IS_TEMPLATE = False;

CREATE OR REPLACE FUNCTION public.sync_factura_anio()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
  NEW.anio := to_char(NEW.fecha,'YYYY');
  RETURN NEW;
END;
$BODY$;

CREATE OR REPLACE FUNCTION public.sync_lastmod()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$

BEGIN
  NEW.fechamodificacion := NOW();
  RETURN NEW;
END;
$BODY$;

CREATE TABLE gt_appingreso (
    idappingreso serial,
    idempresa integer NOT NULL,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    importe numeric DEFAULT 0 NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL
);

CREATE TABLE gt_descansos (
    idguia integer NOT NULL,
    idempresa integer NOT NULL,
    tsdesde timestamp with time zone DEFAULT now() NOT NULL,
    tshasta timestamp with time zone DEFAULT now() NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL
);

CREATE TABLE gt_empresa (
    idempresa serial,
    nombre text DEFAULT ''::text NOT NULL,
    nombrecompleto text DEFAULT ''::text NOT NULL,
    identificacion text DEFAULT ''::text NOT NULL,
    telefono text DEFAULT ''::text NOT NULL,
    fax text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    direccion text DEFAULT ''::text NOT NULL,
    poblacion text DEFAULT ''::text NOT NULL,
    provincia text DEFAULT ''::text NOT NULL,
    codigopostal integer DEFAULT 0 NOT NULL,
    web text DEFAULT ''::text NOT NULL,
    maxdocs integer DEFAULT 30,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL,
    inicioguardia timestamp with time zone,
    idprofilepicture text
);

CREATE TABLE gt_empresausuario (
    idempresa integer NOT NULL,
    idusuario integer NOT NULL,
    rol integer DEFAULT 0 NOT NULL,
    idiomas text[],
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario integer DEFAULT 1 NOT NULL,
    facturadefaulttext text,
    status boolean DEFAULT true
);

CREATE TABLE gt_factura (
    idfactura serial,
    idempresa integer NOT NULL,
    idusuarioemisor integer NOT NULL,
    tipofactura text DEFAULT ''::text NOT NULL,
    numero integer NOT NULL,
    referencia text DEFAULT ''::text NOT NULL,
    identificacion text DEFAULT ''::text NOT NULL,
    nombre text DEFAULT ''::text NOT NULL,
    direccion text DEFAULT ''::text NOT NULL,
    poblacion text DEFAULT ''::text NOT NULL,
    provincia text DEFAULT ''::text NOT NULL,
    codigopostal text DEFAULT ''::text NOT NULL,
    pais text DEFAULT ''::text NOT NULL,
    estado text DEFAULT ''::text NOT NULL,
    fechaestado timestamp with time zone,
    observaciones text DEFAULT ''::text NOT NULL,
    porciva numeric DEFAULT 0 NOT NULL,
    porcretencion numeric DEFAULT 0 NOT NULL,
    base numeric DEFAULT 0 NOT NULL,
    totaliva numeric DEFAULT 0 NOT NULL,
    totalretencion numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    gastos numeric DEFAULT 0 NOT NULL,
    tarifa text DEFAULT ''::text,
    grupos integer[],
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL,
    esgrupofestivo boolean DEFAULT false,
    escompra boolean DEFAULT false,
    emisorgasto text,
    fecha timestamp with time zone NOT NULL,
    agencia_honorarios_pagado boolean DEFAULT false NOT NULL,
    agencia_honorarios_fecha timestamp with time zone,
    agencia_honorarios_importe numeric DEFAULT 0 NOT NULL,
    agencia_gastos_pagado boolean DEFAULT false NOT NULL,
    agencia_gastos_fecha timestamp with time zone,
    agencia_gastos_importe numeric DEFAULT 0 NOT NULL,
    guia_honorarios_pagado boolean DEFAULT false NOT NULL,
    guia_honorarios_fecha timestamp with time zone,
    guia_honorarios_importe numeric DEFAULT 0 NOT NULL,
    guia_gastos_pagado boolean DEFAULT false NOT NULL,
    guia_gastos_fecha timestamp with time zone,
    guia_gastos_importe numeric DEFAULT 0 NOT NULL,
    anio numeric,
    recipient text
);

CREATE TABLE gt_fecha (
    idfecha serial,
    idempresa integer NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL,
    fecha timestamp with time zone NOT NULL,
    festivo boolean DEFAULT true NOT NULL
);

CREATE TABLE gt_grupo (
    idgrupo serial,
    idempresa integer NOT NULL,
    fechahora timestamp with time zone,
    ref text DEFAULT ''::text NOT NULL,
    puntoencuentro text DEFAULT ''::text NOT NULL,
    agencia text DEFAULT ''::text NOT NULL,
    idiomas text[],
    monumentos text[],
    guialocal text DEFAULT ''::text NOT NULL,
    pax integer DEFAULT 0 NOT NULL,
    confirmado boolean DEFAULT false NOT NULL,
    puntofinal text DEFAULT ''::text NOT NULL,
    repite boolean DEFAULT false NOT NULL,
    repitecompleto boolean DEFAULT false NOT NULL,
    repitefecha timestamp with time zone,
    entradasincluidas boolean DEFAULT false NOT NULL,
    telefono text DEFAULT ''::text NOT NULL,
    facilitagrupo text DEFAULT ''::text NOT NULL,
    busempresa text DEFAULT ''::text NOT NULL,
    busdatos text DEFAULT ''::text NOT NULL,
    guiacorreo text DEFAULT ''::text NOT NULL,
    formapago text DEFAULT ''::text NOT NULL,
    tipofactura text DEFAULT ''::text NOT NULL,
    importe numeric DEFAULT 0 NOT NULL,
    observaciones text DEFAULT ''::text NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL,
    facturado2 boolean DEFAULT false,
    tipovisita text[],
    idgrupoorigen integer,
    horafinal timestamp with time zone,
    anulado boolean DEFAULT false NOT NULL,
    observacionimportante boolean DEFAULT false NOT NULL
);

CREATE TABLE gt_guardia (
    idguardia serial,
    idempresa integer NOT NULL,
    idusuarioguardia integer NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL,
    fechaini timestamp with time zone NOT NULL,
    fechafin timestamp with time zone NOT NULL
);

CREATE TABLE gt_lineafactura (
    idlinea serial,
    idempresa integer NOT NULL,
    idfactura integer NOT NULL,
    numlinea integer NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    cantidad numeric DEFAULT 0 NOT NULL,
    precio numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    porciva numeric DEFAULT 0 NOT NULL,
    totaliva numeric DEFAULT 0 NOT NULL,
    observaciones text DEFAULT ''::text NOT NULL,
    isgasto boolean DEFAULT false NOT NULL,
    imprimir boolean DEFAULT true NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL,
    idgrupo integer
);

CREATE TABLE gt_monumento (
    idmonumento serial,
    idempresa integer NOT NULL,
    codigo text DEFAULT ''::text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    precio numeric DEFAULT 0 NOT NULL,
    tel1 text DEFAULT ''::text NOT NULL,
    tel2 text DEFAULT ''::text NOT NULL,
    observaciones text DEFAULT ''::text NOT NULL,
    lunes boolean DEFAULT false NOT NULL,
    lh1 timestamp with time zone,
    lh2 timestamp with time zone,
    lh3 timestamp with time zone,
    lh4 timestamp with time zone,
    martes boolean DEFAULT false NOT NULL,
    mh1 timestamp with time zone,
    mh2 timestamp with time zone,
    mh3 timestamp with time zone,
    mh4 timestamp with time zone,
    miercoles boolean DEFAULT false NOT NULL,
    xh1 timestamp with time zone,
    xh2 timestamp with time zone,
    xh3 timestamp with time zone,
    xh4 timestamp with time zone,
    jueves boolean DEFAULT false NOT NULL,
    jh1 timestamp with time zone,
    jh2 timestamp with time zone,
    jh3 timestamp with time zone,
    jh4 timestamp with time zone,
    viernes boolean DEFAULT false NOT NULL,
    vh1 timestamp with time zone,
    vh2 timestamp with time zone,
    vh3 timestamp with time zone,
    vh4 timestamp with time zone,
    sabado boolean DEFAULT false NOT NULL,
    sh1 timestamp with time zone,
    sh2 timestamp with time zone,
    sh3 timestamp with time zone,
    sh4 timestamp with time zone,
    domingo boolean DEFAULT false NOT NULL,
    dh1 timestamp with time zone,
    dh2 timestamp with time zone,
    dh3 timestamp with time zone,
    dh4 timestamp with time zone,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL
);

CREATE TABLE gt_monumentoincidencia (
    idmonumentoincidencia serial,
    idempresa integer NOT NULL,
    idmonumento integer NOT NULL,
    fechadesde timestamp with time zone NOT NULL,
    fechahasta timestamp with time zone NOT NULL,
    h1 timestamp with time zone,
    h2 timestamp with time zone,
    h3 timestamp with time zone,
    h4 timestamp with time zone,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL
);

CREATE TABLE gt_pdu (
    idpdu serial,
    idempresa integer NOT NULL,
    tabla text DEFAULT ''::text NOT NULL,
    codigo text DEFAULT ''::text NOT NULL,
    nombre text DEFAULT ''::text NOT NULL,
    direccion text DEFAULT ''::text NOT NULL,
    localidad text DEFAULT ''::text NOT NULL,
    codigopostal text DEFAULT 0 NOT NULL,
    provincia text DEFAULT ''::text NOT NULL,
    tel1 text DEFAULT ''::text NOT NULL,
    tel2 text DEFAULT ''::text NOT NULL,
    tel3 text DEFAULT ''::text NOT NULL,
    tel4 text DEFAULT ''::text NOT NULL,
    tel5 text DEFAULT ''::text NOT NULL,
    fax text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    identificacion text DEFAULT ''::text NOT NULL,
    tarifa text DEFAULT ''::text NOT NULL,
    descuento numeric DEFAULT 0 NOT NULL,
    descuentoita numeric DEFAULT 0 NOT NULL,
    formapago text DEFAULT ''::text NOT NULL,
    tipofactura text DEFAULT ''::text NOT NULL,
    observaciones text DEFAULT ''::text NOT NULL,
    fijo boolean DEFAULT false NOT NULL,
    idiomas text[],
    irpf numeric DEFAULT 0 NOT NULL,
    orden numeric DEFAULT 0 NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 100 NOT NULL,
    activo boolean DEFAULT true,
    factpormatriz boolean DEFAULT false,
    guardiaorden integer,
    guardianumdias integer,
    idusuarioapp integer,
    pais text
);

CREATE TABLE gt_pdutabla (
    idpdutabla serial,
    idempresa integer,
    tabla text,
    descripcion text,
    icon text,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 100 NOT NULL
);

CREATE TABLE gt_reservaguia (
    idempresa integer NOT NULL,
    guia text DEFAULT ''::text NOT NULL,
    jornada text DEFAULT 'C'::text NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer DEFAULT 1 NOT NULL,
    fecha timestamp with time zone NOT NULL
);

CREATE TABLE gt_tarifa (
    idtarifa serial,
    idempresa integer NOT NULL,
    codigo text DEFAULT ''::text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    precios json[],
    monumentolaborable numeric DEFAULT 0 NOT NULL,
    monumentofestivo numeric DEFAULT 0 NOT NULL,
    horalaborable numeric DEFAULT 0 NOT NULL,
    horafestivo numeric DEFAULT 0 NOT NULL,
    idiomalaborable numeric DEFAULT 0 NOT NULL,
    idiomafestivo numeric DEFAULT 0 NOT NULL,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    idusuario integer NOT NULL
);

CREATE TABLE gt_usuario (
    idusuario serial,
    nombre text DEFAULT ''::text NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    nombrecompleto text DEFAULT ''::text NOT NULL,
    idultimaempresa integer DEFAULT 0 NOT NULL,
    pushsubscription json,
    tslastlogin timestamp with time zone,
    tslastpassword timestamp with time zone,
    idprofilepicture text,
    fechaalta timestamp with time zone DEFAULT now() NOT NULL,
    fechamodificacion timestamp with time zone DEFAULT now() NOT NULL,
    usuario integer DEFAULT 0 NOT NULL,
    email text,
    resettoken text,
    resetexpires timestamp with time zone
);

ALTER TABLE ONLY gt_appingreso ADD CONSTRAINT gt_appingreso_pkey PRIMARY KEY (idappingreso);

ALTER TABLE ONLY gt_descansos ADD CONSTRAINT gt_descansos_pkey PRIMARY KEY (idguia, idempresa, tsdesde);

ALTER TABLE ONLY gt_empresa ADD CONSTRAINT gt_empresa_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY gt_empresa ADD CONSTRAINT gt_empresa_pkey PRIMARY KEY (idempresa);

ALTER TABLE ONLY gt_empresausuario ADD CONSTRAINT gt_empresausuario_pkey PRIMARY KEY (idempresa, idusuario);

ALTER TABLE ONLY gt_factura ADD CONSTRAINT gt_factura_numero_key UNIQUE (idempresa, idusuarioemisor, tipofactura, anio, numero, escompra);

ALTER TABLE ONLY gt_factura ADD CONSTRAINT gt_factura_pkey PRIMARY KEY (idfactura);

ALTER TABLE ONLY gt_grupo ADD CONSTRAINT gt_grupo_pkey PRIMARY KEY (idgrupo);

ALTER TABLE ONLY gt_guardia ADD CONSTRAINT gt_guardia_pkey PRIMARY KEY (idguardia);

ALTER TABLE ONLY gt_lineafactura ADD CONSTRAINT gt_lineafactura_pkey PRIMARY KEY (idlinea);

ALTER TABLE ONLY gt_monumento ADD CONSTRAINT gt_monumento_codigo_key UNIQUE (idempresa, codigo);

ALTER TABLE ONLY gt_monumento ADD CONSTRAINT gt_monumento_pkey PRIMARY KEY (idmonumento);

ALTER TABLE ONLY gt_monumentoincidencia ADD CONSTRAINT gt_monumentoincidencia_fechadesde_key UNIQUE (idempresa, idmonumento, fechadesde);

ALTER TABLE ONLY gt_monumentoincidencia ADD CONSTRAINT gt_monumentoincidencia_pkey PRIMARY KEY (idmonumentoincidencia);

ALTER TABLE ONLY gt_pdu ADD CONSTRAINT gt_pdu_codigo_key UNIQUE (idempresa, tabla, codigo);

ALTER TABLE ONLY gt_pdu ADD CONSTRAINT gt_pdu_pkey PRIMARY KEY (idpdu);

ALTER TABLE ONLY gt_pdutabla ADD CONSTRAINT gt_pdutabla_pkey PRIMARY KEY (idpdutabla);

ALTER TABLE ONLY gt_pdutabla ADD CONSTRAINT gt_pdutabla_tabla_key UNIQUE (idempresa, tabla);

ALTER TABLE ONLY gt_tarifa ADD CONSTRAINT gt_tarifa_codigo_key UNIQUE (idempresa, codigo);

ALTER TABLE ONLY gt_tarifa ADD CONSTRAINT gt_tarifa_pkey PRIMARY KEY (idtarifa);

ALTER TABLE ONLY gt_usuario ADD CONSTRAINT gt_usuario_email UNIQUE (email);

ALTER TABLE ONLY gt_usuario ADD CONSTRAINT gt_usuario_nombre_key UNIQUE (nombre);

ALTER TABLE ONLY gt_usuario ADD CONSTRAINT gt_usuario_pkey PRIMARY KEY (idusuario);

CREATE TRIGGER sync_factura_anio_insert BEFORE INSERT ON gt_factura FOR EACH ROW EXECUTE FUNCTION sync_factura_anio();

CREATE TRIGGER sync_factura_anio_update BEFORE UPDATE ON gt_factura FOR EACH ROW EXECUTE FUNCTION sync_factura_anio();

CREATE TRIGGER sync_fechamodificacion BEFORE UPDATE ON gt_grupo FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_fechamodificacion BEFORE UPDATE ON gt_pdu FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_fechamodificacion BEFORE UPDATE ON gt_reservaguia FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_appingreso FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_descansos FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_empresa FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_empresausuario FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_factura FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_fecha FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_guardia FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_lineafactura FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_monumento FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_monumentoincidencia FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_pdutabla FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_tarifa FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

CREATE TRIGGER sync_lastmod BEFORE UPDATE ON gt_usuario FOR EACH ROW EXECUTE FUNCTION sync_lastmod();

ALTER TABLE ONLY gt_appingreso ADD CONSTRAINT gt_appingreso_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_descansos ADD CONSTRAINT gt_descansos_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_descansos ADD CONSTRAINT gt_descansos_guia_fkey FOREIGN KEY (idguia) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_descansos ADD CONSTRAINT gt_descansos_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_empresa ADD CONSTRAINT gt_empresa_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_empresausuario ADD CONSTRAINT gt_empresausuario_fkey_01 FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_empresausuario ADD CONSTRAINT gt_empresausuario_fkey_02 FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_empresausuario ADD CONSTRAINT gt_empresausuario_fkey_03 FOREIGN KEY (usuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_factura ADD CONSTRAINT gt_factura_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_factura ADD CONSTRAINT gt_factura_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_factura ADD CONSTRAINT gt_factura_usuarioemisor_fkey FOREIGN KEY (idusuarioemisor) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_fecha ADD CONSTRAINT gt_festivo_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_fecha ADD CONSTRAINT gt_festivo_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_grupo ADD CONSTRAINT gt_grupo_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_grupo ADD CONSTRAINT gt_grupo_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_guardia ADD CONSTRAINT gt_guardia_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_guardia ADD CONSTRAINT gt_guardia_idusuarioguardia_fkey FOREIGN KEY (idusuarioguardia) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_guardia ADD CONSTRAINT gt_guardia_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_lineafactura ADD CONSTRAINT gt_lineafactura_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_lineafactura ADD CONSTRAINT gt_lineafactura_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_monumento ADD CONSTRAINT gt_monumento_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_monumento ADD CONSTRAINT gt_monumento_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_monumentoincidencia ADD CONSTRAINT gt_monumentoincidencia_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_monumentoincidencia ADD CONSTRAINT gt_monumentoincidencia_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_pdu ADD CONSTRAINT gt_pdu_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_pdu ADD CONSTRAINT gt_pdu_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_pdutabla ADD CONSTRAINT gt_pdutabla_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_pdutabla ADD CONSTRAINT gt_pdutabla_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

ALTER TABLE ONLY gt_reservaguia ADD CONSTRAINT gt_reservaguia_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_tarifa ADD CONSTRAINT gt_tarifa_empresa_fkey FOREIGN KEY (idempresa) REFERENCES gt_empresa(idempresa);

ALTER TABLE ONLY gt_tarifa ADD CONSTRAINT gt_tarifa_usuario_fkey FOREIGN KEY (idusuario) REFERENCES gt_usuario(idusuario);

INSERT INTO gt_usuario (idusuario, nombre, password, nombrecompleto, idultimaempresa, usuario, email, idprofilepicture) VALUES (1,'demo', '$2a$10$9dgXZIzca4OB520AaA60Zu882hSLbUt7DdjxBTrlbpYFTi9V4vtJy', 'demo', 1, 1, 'your_email@guiame_app_email.com', '00000');
INSERT INTO gt_empresa (idempresa, nombre, nombrecompleto, maxdocs, idprofilepicture, idusuario) VALUES(1, 'EMP', 'EMP', 50, 'ITA', 1);
INSERT INTO gt_empresausuario (idempresa, idusuario, rol, usuario) values (1, 1, 9, 1);
INSERT INTO gt_pdu (idempresa, tabla, codigo, nombre, email, idiomas, irpf, orden, idusuarioapp, fijo, guardiaorden, guardianumdias, idusuario) SELECT 1, 'guia', 'demo', 'demo', 'your_email@guiame_app_email.com', '{ES}', 15, 1, 1, true, 1, 7, 1;
INSERT INTO gt_pdu (idempresa, tabla, codigo, nombre, idusuario, descripcion, icon)
  SELECT 1, 'agencia', 'AGE1', 'AGENCIA DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'formapago', 'CON', 'CONTADO', 1 UNION ALL
  SELECT 1, 'formapago', 'TAR', 'TARJETA', 1 UNION ALL
  SELECT 1, 'tipofactura', 'TEST', 'TIPO DE FACTURA DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'tipofactura', 'OFC', 'FACTURA OFICIAL', 1 UNION ALL
  SELECT 1, 'tipovisita', 'TVI1', 'TIPO DE VISITA DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'idioma', 'ES', 'ESPAÑOL', 1 UNION ALL
  SELECT 1, 'idioma', 'IN', 'INGLÉS', 1 UNION ALL
  SELECT 1, 'puntoencuentro', 'ENC1', 'PUNTO DE ENCUENTRO DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'guiacorreo', 'GCO1', 'GUÍA CORREO DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'facilitagrupo', 'FGR1', 'FACILITA GRUPO DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'busempresa', 'BUS1', 'EMPRESA AUTOBUSES DE PRUEBAS', 1 UNION ALL
  SELECT 1, 'provincia', 'SE', 'SEVILLA', 1;
INSERT INTO gt_monumento (idempresa, codigo, descripcion, precio, idusuario) VALUES (1, 'CAT', 'CATEDRAL', 11, 1);
INSERT INTO gt_tarifa(idempresa, codigo, descripcion, precios, monumentolaborable, monumentofestivo, horalaborable, horafestivo, idiomalaborable, idiomafestivo, idusuario) VALUES (1, '001', 'TARIFA DE EJEMPLO', array['{"tipovisita":"TVI1", "paxdesde":1, "paxhasta":50, "laborable":100, "festivo":150}']::json[], 30, 50, 30, 50, 30, 50, 1);
UPDATE gt_pdu SET tarifa = '001', formapago = 'CON', tipofactura = 'OFC' WHERE idempresa = 1 AND tabla = 'agencia' AND codigo = 'AGE1';

INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'idioma','IDIOMA','flag',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'puntoencuentro','PUNTO ENCUENTRO','place',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'guia','GUÍA','face',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'busempresa','BUS EMPRESA','directions_bus',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'guiacorreo','GUÍA CORREO','person',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'formapago','FORMA DE PAGO','paid',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'facilitagrupo','FACILITA GRUPO','contact_phone',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'agencia','AGENCIA','cottage',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'tipofactura','TIPO FACTURA','receipt_long',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'tipovisita','TIPO VISITA','route',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'proveedor','PROVEEDOR','delivery_dining',1);
INSERT INTO gt_pdutabla (idempresa, tabla, descripcion, icon, idusuario) values (1,'provincia','PROVINCIA','public',1);