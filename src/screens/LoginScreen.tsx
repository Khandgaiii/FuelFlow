import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';

// --- Inline Google SVG Logo (no external dependency needed) ---
import Svg, { Path, G, ClipPath, Rect, Defs } from 'react-native-svg';

const GoogleLogo = () => (
  <Svg width="20" height="20" viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </Svg>
);

type Mode = 'login' | 'signup';

const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const isDark = colors.background === '#000' || colors.background < '#888';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '301509148498-885pdeqhul3ieat73urmcb9tssrevmll.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  // --- Google ---
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('ID токен олдсонгүй');
      const credential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(credential);
    } catch (error: any) {
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.code === statusCodes.IN_PROGRESS
      )
        return;
      Alert.alert('Алдаа', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Email ---
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Анхааруулга', 'Имэйл болон нууц үгээ оруулна уу.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'login') {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        await auth().createUserWithEmailAndPassword(email, password);
      }
    } catch (error: any) {
      const msg =
        error.code === 'auth/user-not-found'
          ? 'Хэрэглэгч олдсонгүй.'
          : error.code === 'auth/wrong-password'
          ? 'Нууц үг буруу байна.'
          : error.code === 'auth/email-already-in-use'
          ? 'Имэйл хаяг бүртгэлтэй байна.'
          : error.code === 'auth/weak-password'
          ? 'Нууц үг хэтэрхий богино байна.'
          : error.message;
      Alert.alert('Алдаа', msg);
    } finally {
      setLoading(false);
    }
  };

  const CARD = isDark ? '#1A1A1A' : '#F5F5F5';
  const BORDER = isDark ? '#2A2A2A' : '#E5E5E5';
  const PLACEHOLDER = isDark ? '#555' : '#AAA';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <Text style={styles.iconEmoji}>⛽</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>FuelFlow</Text>
            <Text style={[styles.appSub, { color: colors.text }]}>
              Түлшний зарцуулалтаа ухаалгаар хянаарай
            </Text>
          </View>

          {/* ── Tab toggle ── */}
          <View style={[styles.tabRow, { backgroundColor: CARD }]}>
            {(['login', 'signup'] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tab, mode === m && styles.tabActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: mode === m ? '#fff' : colors.text }, mode !== m && { opacity: 0.4 }]}>
                  {m === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Inputs ── */}
          <View style={styles.inputs}>
            <TextInput
              style={[styles.input, { backgroundColor: CARD, borderColor: BORDER, color: colors.text }]}
              placeholder="Имэйл хаяг"
              placeholderTextColor={PLACEHOLDER}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={[styles.input, { backgroundColor: CARD, borderColor: BORDER, color: colors.text }]}
              placeholder="Нууц үг"
              placeholderTextColor={PLACEHOLDER}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* ── Primary button ── */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleEmailAuth}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={[styles.divLine, { backgroundColor: BORDER }]} />
            <Text style={[styles.divText, { color: colors.text }]}>эсвэл</Text>
            <View style={[styles.divLine, { backgroundColor: BORDER }]} />
          </View>

          {/* ── Google button ── */}
          <TouchableOpacity
            style={[styles.googleBtn, { backgroundColor: CARD, borderColor: BORDER }]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <GoogleLogo />
            <Text style={[styles.googleBtnText, { color: colors.text }]}>
              Google-ээр нэвтрэх
            </Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ORANGE = '#F97316';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 36,
    justifyContent: 'center',
    gap: 16,
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: 8, gap: 8 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 4,
  },
  iconEmoji: { fontSize: 34 },
  appName: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  appSub: { fontSize: 14, opacity: 0.4, textAlign: 'center', lineHeight: 20 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: ORANGE },
  tabText: { fontWeight: '700', fontSize: 14 },

  // Inputs
  inputs: { gap: 10 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },

  // Primary btn
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 13, opacity: 0.35, fontWeight: '500' },

  // Google btn
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: { fontSize: 15, fontWeight: '600' },
});

export default LoginScreen;