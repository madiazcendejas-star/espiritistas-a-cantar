-- Pruebas de la tienda: una compra por persona y producto, y seguridad.
\set ON_ERROR_STOP on
insert into app.products (id, title, price, is_visible) values (1, 'Ebook de prueba', 199, true);
insert into app.product_purchases (product_id, profile_id, amount, stripe_payment_id) values (1, 1, 199, 'pi_prueba_1');
do $$ begin
  insert into app.product_purchases (product_id, profile_id, amount) values (1, 1, 199);
  raise exception 'FALLÓ: se permitió comprar dos veces el mismo producto';
exception when unique_violation then raise notice 'ok  una compra por persona y producto';
end $$;
do $$ begin
  insert into app.product_purchases (product_id, profile_id, amount, stripe_payment_id) values (1, 2, 199, 'pi_prueba_1');
  raise exception 'FALLÓ: se repitió un pago de Stripe';
exception when unique_violation then raise notice 'ok  un pago de Stripe se registra una sola vez';
end $$;
set role anon;
do $$ begin
  perform 1 from app.products;
  raise exception 'FALLÓ: visitante pudo leer productos directamente';
exception when insufficient_privilege then raise notice 'ok  productos solo desde el servidor';
end $$;
reset role;
\echo 'PRUEBAS DE TIENDA PASARON'
