import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MCI from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { getApp } from '@react-native-firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithCredential,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import { useTheme } from '../context/ThemeContext';
import Svg, { Path } from 'react-native-svg';

const GoogleLogo = () => (
  <Svg width="18" height="18" viewBox="0 0 48 48">
    <Path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <Path
      fill="#FF3D00"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <Path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <Path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </Svg>
);

type Mode = 'login' | 'signup';

const LoginScreen: React.FC = () => {
  const { colors } = useTheme();
  const isDark = colors.background === '#000000' || colors.background === '#000' || colors.background < '#888';
  const firebaseAuth = getAuth(getApp());

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '301509148498-885pdeqhul3ieat73urmcb9tssrevmll.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('ID токен олдсонгүй');
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(firebaseAuth, credential);
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

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Анхааруулга', 'Имэйл болон нууц үгээ оруулна уу.');
      return;
    }
    try {
      setLoading(true);
      if (mode === 'login') {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
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

  const BG = colors.background;
  const CARD = isDark ? '#1C1C1E' : '#F2F2F7';
  const BORDER = isDark ? '#2C2C2E' : '#E5E5EA';
  const PLACEHOLDER = isDark ? '#636366' : '#AEAEB2';

  return (
    <SafeAreaView style={[S.safe, { backgroundColor: BG }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={BG}
      />
      <KeyboardAvoidingView
        style={S.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={S.flex}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero ── */}
          <View style={S.hero}>
            <View style={S.iconCircle}>
              <MCI name="gauge" size={48} color="#fff" />
            </View>
            <Text style={S.brandRow}>
              <Text style={S.brandOrange}>Fuel</Text>
              <Text style={[S.brandWhite, { color: colors.text }]}>Flow</Text>
            </Text>
            <Text style={[S.tagline, { color: PLACEHOLDER }]}>
              Түлшний зарцуулалтаа ухаалгаар хянаарай
            </Text>
          </View>

          {/* ── Mode selector ── */}
          <View style={[S.segmentRow, { backgroundColor: CARD }]}>
            {(['login', 'signup'] as Mode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[S.segment, mode === m && S.segmentActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    S.segmentText,
                    { color: mode === m ? '#fff' : PLACEHOLDER },
                    mode === m && S.segmentTextActive,
                  ]}
                >
                  {m === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Inputs ── */}
          <View style={S.inputs}>
            <View style={[S.inputWrap, { backgroundColor: CARD, borderColor: BORDER }]}>
              <TextInput
                style={[S.input, { color: colors.text }]}
                placeholder="Имэйл хаяг"
                placeholderTextColor={PLACEHOLDER}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={[S.inputWrap, { backgroundColor: CARD, borderColor: BORDER }]}>
              <TextInput
                style={[S.input, { color: colors.text }]}
                placeholder="Нууц үг"
                placeholderTextColor={PLACEHOLDER}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* ── Primary button ── */}
          <TouchableOpacity
            style={[S.primaryBtn, loading && S.primaryBtnDisabled]}
            onPress={handleEmailAuth}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={S.primaryBtnText}>
                {mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={S.divider}>
            <View style={[S.divLine, { backgroundColor: BORDER }]} />
            <Text style={[S.divText, { color: PLACEHOLDER }]}>эсвэл</Text>
            <View style={[S.divLine, { backgroundColor: BORDER }]} />
          </View>

          {/* ── Google button ── */}
          <TouchableOpacity
            style={[S.googleBtn, { backgroundColor: CARD, borderColor: BORDER }]}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <GoogleLogo />
            <Text style={[S.googleBtnText, { color: colors.text }]}>
              Google-ээр нэвтрэх
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const ORANGE = '#F97316';

const S = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 16,
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: 12, gap: 12 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  brandRow: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  brandOrange: { color: ORANGE, fontSize: 36, fontWeight: '800' },
  brandWhite: { fontSize: 36, fontWeight: '800' },
  tagline: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Segment
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: ORANGE },
  segmentText: { fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: '#fff' },

  // Inputs
  inputs: { gap: 10 },
  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: { fontSize: 15, padding: 0 },

  // Primary button
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 13, fontWeight: '500' },

  // Google
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
