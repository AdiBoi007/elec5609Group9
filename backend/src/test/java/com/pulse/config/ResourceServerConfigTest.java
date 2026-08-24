package com.pulse.config;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ResourceServerConfigTest {

    @Test
    void decodesSupabaseEs256Token() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keyPair = generator.generateKeyPair();
        ECKey signingKey = new ECKey.Builder(Curve.P_256, (ECPublicKey) keyPair.getPublic())
                .privateKey((ECPrivateKey) keyPair.getPrivate())
                .algorithm(JWSAlgorithm.ES256)
                .keyID("supabase-test-key")
                .build();

        byte[] jwks = new JWKSet(signingKey.toPublicJWK())
                .toString()
                .getBytes(StandardCharsets.UTF_8);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/jwks", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jwks.length);
            try (var responseBody = exchange.getResponseBody()) {
                responseBody.write(jwks);
            }
        });
        server.start();

        try {
            String issuer = "https://example.supabase.co/auth/v1";
            Instant now = Instant.now();
            SignedJWT signedJwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.ES256)
                            .keyID(signingKey.getKeyID())
                            .build(),
                    new JWTClaimsSet.Builder()
                            .issuer(issuer)
                            .subject("5dc35ce8-02f6-4cec-a5c7-03be3f231234")
                            .audience("authenticated")
                            .claim("email", "user@example.com")
                            .issueTime(Date.from(now))
                            .expirationTime(Date.from(now.plusSeconds(300)))
                            .build());
            signedJwt.sign(new ECDSASigner(signingKey));

            JwtDecoder decoder = new ResourceServerConfig().jwtDecoder(
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/jwks",
                    issuer);
            Jwt decoded = decoder.decode(signedJwt.serialize());

            assertEquals("user@example.com", decoded.getClaimAsString("email"));
            assertEquals("authenticated", decoded.getAudience().getFirst());
        } finally {
            server.stop(0);
        }
    }
}
